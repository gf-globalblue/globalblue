function applyExtensions(win) {
	win.HTMLCollection.prototype.first = function() {
		if (this.length < 1) throw new Error(`Empty HTMLCollection encountered`);
		return this[0];
	}

	win.HTMLCollection.prototype.map = function(mapFunc) {
		return Array.from(this).map(mapFunc);
	}

	win.HTMLElement.prototype.enableDragDropFile = function(fileHandler) {
		for (let eventName of ['dragenter', 'dragover', 'dragleave']) {
			this.addEventListener(eventName, function(e) {
				e.preventDefault();
				e.stopPropagation();
			}, false);
		};
		this.addEventListener('drop', e => {
			e.preventDefault();
			e.stopPropagation();
			for (let file of e.dataTransfer.files) fileHandler(file);
		}, false);
	}

	win.HTMLElement.prototype.createAndAppendChildElement = function(tag, options) {
		let el = this.ownerDocument.createElement(tag);
		if (options) {
			for (let [k, v] of Object.entries(options)) el[k] = v;
		}
		this.appendChild(el);
		return el;
	}
	
	win.HTMLElement.prototype.removeAllChildren = function() {
		while (this.firstChild) this.removeChild(this.lastChild);
	}
	
//	win.Element.prototype.removeAllChildren = function() {
//		for (let child of Array.from(this.childNodes)) {
//			child.remove();
//		}
//	}
	
	win.Element.prototype.createChildElement = function(tagName, properties) {
		let el = this.ownerDocument.createElement(tagName);
		Object.assign(el, properties);
		this.appendChild(el);
		return el;
	}
	
	
	class TableCell {
		constructor(value, cellFormatter) {
			this.value = value;
			this.cellFormatter = cellFormatter;
		}
		
		draw(parent, cellFormatter) {
			let td = parent.ownerDocument.createElement("td");
			td.innerText = this.value;
			let thisCellFormatter = this.cellFormatter || cellFormatter;
			if (thisCellFormatter instanceof Function) thisCellFormatter(td);
			return td;
		}
		
		static fromValue(val) {
			return val instanceof TableCell ? val : new TableCell(val);
		}
	}
	win.TableCell = TableCell;
	
	class TableRow {
		constructor(cells, cellFormatter) {
			this.cells = Array.isArray(cells) ? cells.map(value => TableCell.fromValue(value)) : [];
			this.cellFormatter = cellFormatter;
		}
		
		draw(parent, cellFormatter) {
			let tr = parent.ownerDocument.createElement("tr");
			let defaultCellFormatter = this.cellFormatter || cellFormatter;
			this.cells.forEach(c => {
				tr.appendChild(c.draw(parent, defaultCellFormatter));
			});
			return tr;
		}
	}
	win.TableRow = TableRow;
	
	class Table {
		constructor() {
			this.rows = [];
			this.cellFormatter = undefined;
			this.tableFormatter = undefined;
		}
		
		appendRow() {
			this.rows.push(new TableRow(...arguments));
		}
		
		draw(parent) {
			let table = parent.createChildElement("table");
			
			this.rows.forEach(r => {
				let tr = r.draw(parent, this.cellFormatter);
				table.appendChild(tr);
			});
			
			if (this.tableFormatter instanceof Function) this.tableFormatter(table);
			return table;
		}
	}
	win.Table = Table;
}

applyExtensions(window);

module.exports = {
	applyExtensions
}