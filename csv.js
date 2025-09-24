window.CSV = module.exports = class CSV {
	constructor(content, {newLine = "\n", splitChar = ",", quoteChar = "\"", firstRowIsHeader = false} = {}) {
		let rows = Array.from(__parseLines());
		this.header = firstRowIsHeader ? CSV.splitLine(rows.shift(), splitChar, quoteChar) : [];
		this.rows = rows.filter(row => row.length > 0).map(row => CSV.splitLine(row, splitChar, quoteChar));
		
		function __getContentBuf() {
			if (content instanceof Uint8Array) return content;
			if (content instanceof ArrayBuffer) return new Uint8Array(content);
			if (typeof(content) === 'string') return new TextEncoder().encode(content);
			throw new Error(`unknown content type`);
		}
		
		function* __parseLines() {
			let cBuf = __getContentBuf();
			let nl = new TextEncoder().encode(newLine);
			let decoder = new TextDecoder();
			let beginLine = 0;
			for (let ofs = 0; ofs < cBuf.length; ofs++) {
				let foundAt = cBuf.indexOf(nl[0], ofs);
				if (foundAt >= 0) {
					ofs = foundAt;
					if (__compareSequenceAt(cBuf, nl, foundAt)) {
						yield decoder.decode(cBuf.slice(beginLine, foundAt));
						ofs += nl.length - 1;
						beginLine = ofs + 1;
					}
				} else {
					break;
				}
			}
			if (beginLine < cBuf.length) yield decoder.decode(cBuf.slice(beginLine));
			
			function __compareSequenceAt(buf, seq, atOffset) {
				for (let i = 0; i < seq.length; i++) if (buf[atOffset + i] !== seq[i]) return false;
				return true;
			}
		}
	}
	
	
	* entries() {
		for (let row of this.rows) {
			yield Object.fromEntries(this.header.map((hdr, idx) => [hdr, row[idx]]));
		}
	}
	
	* select() {
		let useObject = Array.from(arguments).some(arg => typeof(arg) === 'function');
		let selectors = Array.from(arguments).map(arg => {
			switch (typeof(arg)) {
				case 'function':
					return arg;
				case 'string':
					if (useObject) return obj => obj[arg];
					let idx = this.header.indexOf(arg);
					return row => row[idx];
				case 'number':
					if (!useObject) return row => row[arg];
					let name = this.header[arg];
					return obj => obj[name];
				default:
					throw new Error(`unknown selector type ${typeof(arg)}`);
			}
		});
		for (let row of (useObject ? this.entries() : this.rows)) {
			yield selectors.map(sel => sel(row));
		}
	}
	
	static unquote(string, quoteChar) {
		if (string.length > 1 && string[0] === quoteChar && string[string.length - 1] === quoteChar) {
			return string.substring(1, string.length - 1).replace(/""/g, '"');
		}
		return string;
	}
	
	static getEnd(string, endChar, quoteChar, startAt) {
		let outside = true;
		for (let i = startAt; i < string.length; i++) {
			if (string[i] === quoteChar) {
				outside = !outside;
			} else if (outside && string[i] === endChar) {
				return i;
			}
		}
	}

	static splitLine(line, splitChar, quoteChar) {
		let items = [];
		for (let ofs = 0; ofs < line.length;) {
			let eof = CSV.getEnd(line, splitChar, quoteChar, ofs);
			items.push(CSV.unquote(line.substring(ofs, eof), quoteChar));
			ofs = eof + 1;
		}
		return items;
	}
}