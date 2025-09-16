function applyExtensions(win) {
	win.Encodings = {
		UTF8: "UTF-8",
		ISO_8859_1: "ISO-8859-1",
		Unicode: "Unicode"
	}

	win.File.prototype.readAsTextAsync = function(encoding) {
		let reader = new FileReader();
		return new Promise(resolve => {
			reader.readAsText(this, encoding);
			reader.onloadend = a => resolve(reader.result);
		});
	}

	win.File.prototype.readAllAsync = function() {
		let reader = new FileReader();
		return new Promise(resolve => {
			reader.readAsArrayBuffer(this);
			reader.onloadend = evt => resolve(reader.result);
		});
	}

	win.File.prototype.readAsText = function(onLoad) {
		this.reader = new FileReader();
		this.reader.readAsText(this);
		this.reader.onload = onLoad;
	}

	win.File.prototype.readLines = function(lineProc, finProc) {
		let me = this;
		const CHUNK_SIZE = 512 * 1024;
		let offset = 0;
		let reader = new FileReader();
		let buf = '';
		readNextChunk();
		
		reader.onload = function(evt) {
			buf += evt.target.result;
			offset += CHUNK_SIZE;
			if (evt.target.result.length > 0) {
				if (processBuffer(false)) readNextChunk();
				return;
			} else {
				processBuffer(true);
			}
			if (finProc) finProc(me);
		};
		
		function processBuffer(fin) {
			let lines = buf.split("\n");
			let lastLineIndex = fin ? lines.length : lines.length - 1;
			for (let i = 0; i < lastLineIndex; i++) {
				if (! lineProc(lines[i])) return false;
			}
			buf = lines.last();
			return true;
		}
		
		function readNextChunk() {
			reader.readAsText(me.slice(offset, offset + CHUNK_SIZE));
		}
	}
}

applyExtensions(window);

module.exports = {
	applyExtensions
}