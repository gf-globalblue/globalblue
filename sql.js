await require("iterables.js");

window.SQL = module.exports =  class SQL {
	static stringToConstant(str) {
		return str
			.split("")
			.map(ch => {
				let cc = ch.charCodeAt(0);
				return {ch, cc, cls: (cc >= 32 && cc <=125) ? 0 : 1};
			})
			.segment(state => state.previous.value.cls !== state.current.value.cls)
			.map(s => {
				// if all characters are ASCII compatible (32-125) then just print the original string
				if (s[0].cls === 0) return "'" + s.map(a => a.ch).join("").replaceAll("'","''") + "'";
				// if not: return whatever is shorter: a chain of (N)CHARs or a CONVERT from binary
				let variant1 = s.map(c => `${c.cc > 255 ? "N" : ""}CHAR(${c.cc})`).join("+");
				// conversion from binary demands for all character to be unicode if a single char has a value greater than 255
				let variant2 = s.some(c => c.cc > 255) ? `CONVERT(NVARCHAR,0x${__toHex16LE(s)})` : `CONVERT(VARCHAR,0x${__toHex(s)})`;
				return variant1.length < variant2.length ? variant1 : variant2;
			})
			.join("+");
			
		function __toHex16LE(segment) {
			return segment.map(c => {
				let v = c.cc.toString(16).padStart(4, '0');
				return v[2] + v[3] + v[0] + v[1];
			}).join("");
		}
		
		function __toHex(segment) {
			return segment.map(c => c.cc.toString(16).padStart(2, '0')).join("");
		}
	}
	
	static quoteString(str) {
		return `'${str.replaceAll("'", "''")}'`;
	}
	
	static quoteName(name) {
		if (name[0] === '[' && name[name.length - 1] === ']') return name;
		return `[${name.replaceAll("]", "]]")}]`;
	}
	
	static constantFrom(val) {
		switch (typeof(val)) {
			case 'string':
				return SQL.stringToConstant(val);
			case 'undefined':
				return 'NULL';
			case 'object':
				if (val === null) return 'NULL';
			default:
				return val;
		}
	}
	
	static valuesFrom(arr) {
		return '\n' +
			arr
				.map(row => '\t(' + row.map(val => SQL.constantFrom(val)).join(", ") + ')')
				.join(',\n')
	}
	
	static createInsertStatement(arr, objectName) {
		const columnNames = [...arguments].slice(2);
		const colNameStr = columnNames.length > 0 ? ` (${columnNames.map(n => SQL.quoteName(n)).join(", ")})` : "";
		return arr
			.batch(1000)
			.map(rows => `INSERT INTO ${objectName}${colNameStr} VALUES ` + SQL.valuesFrom(rows))
			.join(";\n");
	}
}