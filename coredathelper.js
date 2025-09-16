//fetch("https://raw.githubusercontent.com/gf-globalblue/globalblue/refs/heads/dev/coredatHelper.js").then(async r=>(async f=>0).constructor(await r.text())(r)));
if (! window.require) await fetch(new URL(".", arguments[0].url).href + "modloader.js").then(r=>r.text().then(t=>new Function(t)(r)));

const extensions = [
	await require("fileExtensions.js"),
	await require("dateExtensions.js"),
	await require("htmlExtensions.js")
];

window.TimeSheetHelper = new (class TimeSheetHelper {
	initialize() {
		if (! this.grid?.entBox) {
			this.timeSheetWindow = [window, ...Array.from(document.getElementsByTagName("iframe")).map(i => i.contentWindow)].filter(w => w.location.pathname.match(/\/Time\.aspx/))[0];
			if (! this.timeSheetWindow) return false;
			extensions.forEach(ex => ex.applyExtensions(this.timeSheetWindow));
			this.grid = this.timeSheetWindow.timeGrid;
			if (! this.grid?.entBox) return false;
			this.absenceReasons = this.getComboValues("TimeData.AbsenceReasonNo");
			const idTimeSheetHelperDropZone = "TimeSheetHelperDropZone";
			if (!this.timeSheetWindow.document.getElementById(idTimeSheetHelperDropZone)) {
				let dropZone = this.timeSheetWindow.timeToolbar.base.createAndAppendChildElement("div", {
					id: idTimeSheetHelperDropZone,
					innerText: "drop file here",
					style: "width: auto; padding-left: 10px; padding-right: 10px; background-color:white; display:flex; align-items:center; justify-content: center; margin: 4px; border-style: dashed; border-radius: 6px; border-width:1px"
				});
				dropZone.enableDragDropFile(this.processFile.bind(this));
			}
			return true;
		}
	}
	
	resolveColumn(ref) {
		return (typeof(ref) === 'string') ? this.grid.columnIds.indexOf(ref) : ref;
	}
	
	resolveCell(ref) {
		if (Array.isArray(ref)) {
			let colIdx = this.resolveColumn(ref[1]);
			return (typeof(ref[0]) === 'string') ? this.grid.cellById(ref[0], colIdx) : this.grid.cellByIndex(ref[0], colIdx);
		} else {
			return ref;
		}
	}
	
	getCells() {
		let shortNames = this.grid.columnIds.map(colName => colName.split(".").at(-1));
		return Object.entries(this.grid.rowsAr).map(([rowId, row]) => Object.assign({
			_row: row,
			_id: rowId,
			_cells: Object.fromEntries(shortNames.map((colName, colIdx) => [colName, this.grid.cells(rowId, colIdx)]))
		}, Object.fromEntries(shortNames.map((colName, colIdx) => [colName, this.getCellValue(this.grid.cells(rowId, colIdx))]))));
	}
	
	getCellValue(cell) {
		if (!cell) return;
		let val = cell.getValue();
		if (cell.getDate) {
			return new Date(val.split('.').reverse().join("-"));
		}
		return val;
	}
	
	writeEntry(date, from, to, reason = "") {
		let gridDate = this.timeSheetWindow.timeGridCalendar.getDate();
		if (gridDate.getYear() !== date.getYear() || gridDate.getMonth() !== date.getMonth()) {
			console.log(`Entry date ${date.toISOString()} is outside of timeGrid`);
			return;
		}
		if (reason !== "" || reason instanceof RegExp) {
			let foundReasons = this.absenceReasons.filter(ar => ar[0].match(reason) || ar[1].match(reason));
			if (foundReasons.length > 1) throw new Error(`ambigous absenceReason ${reason}`);
			if (foundReasons.length === 0) throw new Error(`invalid absenceReason ${reason}`);
			reason = foundReasons[0][0];
		}
		let dayRows = this.getCells().filter(row => !row._id.match("Sum") && date.isSameDay(row.Date));
		if (! dayRows.some(row => row.FromTime === from && row.ToTime === to && row.AbsenceReasonNo === reason)) {
			let emptyRows = dayRows.filter(row => row.FromTime === '' && row.ToTime === '');
			let rowId;
			if (emptyRows.length > 0) {
				rowId = emptyRows[0]._id;
				console.log(`found empty row ${rowId}`);
			} else {
				rowId = this.grid.uid();
				let lastRowIndex = Math.max(...dayRows.map(row => this.grid.rowsBuffer.indexOf(row._row)), -1);
				this.grid.addRow(rowId, [], lastRowIndex + 1);
				console.log(`added row ${rowId} at ${lastRowIndex + 1}`);
				let dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getYear() + 1900}`;
				this.pickCell(this.grid.rowsAr[rowId], "TimeData.Date").setValue(dateStr);
			}
			let row = this.grid.rowsAr[rowId];
			this.updateCell(this.pickCell(row, "TimeData.FromTime"), from);
			this.updateCell(this.pickCell(row, "TimeData.ToTime"), to);
			this.updateCell(this.pickCell(row, "TimeData.AbsenceReasonNo"), reason);
		}
	}
	
	pickCell(rowRef, column) {
		let colIdx = (typeof(column) === 'number') ? column : this.grid.columnIds.indexOf(column);
		return this.grid.cells4((rowRef._childIndexes) ? rowRef.childNodes[rowRef._childIndexes[colIdx]] : rowRef.childNodes[colIdx]);
	}
	
	getComboValues(column) {
		let combo = this.grid.combos[this.resolveColumn(column)];
		return combo.keys.map((k, i) => [k, combo.values[i]]);
	}
	
	getColumnNames() {
		return this.grid.columnIds;
	}
	
	updateCell(ref, newValue) {
		let gridCell = this.resolveCell(ref);
		gridCell.setValue(newValue);
		gridCell.cell.wasChanged = true;
		let rowId = gridCell.cell.parentNode.idd;
		let cellIndex = gridCell.cell.cellIndex;
		const editStage = 2; // closed
		gridCell.grid.callEvent("onEditCell", [editStage, rowId, cellIndex, newValue]);
		gridCell.grid.dataProcessor.setUpdated(rowId, true, "inserted")
	}
	
	async processFile(file) {
		if (! this.initialize()) throw new Error("unable to initialize TimeSheetHelper");
		let fileContent = await file.readAllAsync();
		if (file.name.match(/\.csv$/i)) {
			await require("CSV.js");
			let csv = new CSV(fileContent, {newLine: "\r\n", firstRowIsHeader: true});
			for (let row of csv.entries()) {
				try {
					this.writeEntry(new Date(row.Date), row.FromTime, row.ToTime, row.AbsenseReasonNo);
				} catch (err) {
					alert(`Failed to update row ${JSON.stringify(row)}: ${err.message}`);
				}
			}
		} else if (file.name.match(/^mytime.actions$/i)) {
			let mtu = await require("myTimeUtil.js");
			await mtu.importToCoredat(fileContent, this);
		}
		
	}
});

window.coredatObserver ??= new MutationObserver(document.body, evt => TimeSheetHelper.initialize());

