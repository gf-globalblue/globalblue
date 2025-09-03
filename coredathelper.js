window.TimeSheetHelper = new (class TimeSheetHelper {
	initialize() {
		this.timeSheetWindow = [window, ...Array.from(document.getElementsByTagName("iframe")).map(i => i.contentWindow)].filter(w => w.location.pathname.match(/\/Time\.aspx/))[0];
		if (this.timeSheetWindow) {
			this.grid = this.timeSheetWindow.timeGrid;
			this.absenceReasons = this.getComboValues("TimeData.AbsenceReasonNo");
			return true;
		} else {
			console.error("could not find timeSheet window frame")
			return false;
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
	
	getCells(columns) {
		let colIds = Array.from(arguments).map(column => this.resolveColumn(column));
		return Object.keys(this.grid.rowsAr).map(rowId => [rowId, ...colIds.map(c => this.grid.cells(rowId, c))]);
	}
	
	getComboValues(column) {
		let combo = this.grid.combos[this.resolveColumn(column)];
		return combo.keys.map((k, i) => [k, combo.values[i]]);
	}
	
	updateCell(ref, newValue) {
		let gridCell = this.resolveCell(ref);
		gridCell.setValue(newValue);
		gridCell.cell.wasChanged = true;
		let editStage = 2; // closed
		let rowId = gridCell.cell.parentNode.idd;
		let cellIndex = gridCell.cell.cellIndex;
		gridCell.grid.callEvent("onEditCell", [2, rowId, cellIndex, newValue]);
		if (gridCell.grid.dataProcessor.updatedRows.indexOf(rowId) < 0) {
			ts.grid.dataProcessor.updatedRows.push(rowId);
		}
	}
});