//fetch("https://raw.githubusercontent.com/gf-globalblue/globalblue/refs/heads/dev/clarityImport.js").then(async r=>(async f=>0).constructor(await r.text())(r))
{ 
	async function delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	function deepMerge(tgt, src) {
		for (const key in src) {
			if (src[key] !== null && typeof(src[key]) === 'object' && !Array.isArray(src[key])) {
				if (!tgt[key] || typeof(tgt[key]) !== 'object') tgt[key] = {};
				deepMerge(tgt[key], src[key]);
			} else {
				tgt[key] = src[key];
			}
		}
	}

	function typeCheck(obj, definition) {
		return Object.entries(definition).every(e => typeof(obj[e[0]]) === e[1]);
	}

	Array.prototype.sum = function() { return this.reduce((a, c) => a + c, 0); }

	HTMLCollection.prototype.items = function*() { yield* this; }

	Iterator.prototype.singleOrDefault = function(defEmpty, defMany) { let f = this.next(), s = !f.done && this.next(); return f.done ? defEmpty : s.done ? f.value : defMany; }

	Iterator.prototype.pairs = function* () { let c = this.next(); for (let n; !(n = this.next()).done; c = n) yield [c.value, n.value]; };

	Iterator.prototype.groupBy = function* (keyFunc, valueFunc = a => a) {
		let root = new Map();
		let groups = [];
		for (let item of this) {
			let key = keyFunc(item);
			let curr = root;
			for (let k of key) {
				if (!curr.has(k)) curr.set(k, new Map());
				curr = curr.get(k);
			}
			if (!curr.group) {
				curr.group = {key, items: [valueFunc(item)]};
				groups.push(curr.group);
			} else {
				curr.group.items.push(valueFunc(item));
			}
		}
		yield* groups.values();
	}

	Date.prototype.dayIndex = function() {
		return Math.floor(this.getTime() / 86400000);
	}

	HTMLElement.prototype.createChild = function(tag) {
		let el = this.ownerDocument.createElement(tag);
		let attr = Object.assign({}, ...Array.from(arguments).slice(1));
		deepMerge(el, attr);
		this.appendChild(el);
		return el;
	}

	function parseClarityDay(str) {
		let match = str.match(/^(?<day>\d+)\/(?<month>\d+)\/(?<year>\d+)$/);
		if (match.groups) {
			return Math.floor(Date.UTC(parseInt(match.groups.year) + 2000, parseInt(match.groups.month) - 1, parseInt(match.groups.day)) / 86400000);
		}
	}

	async function retryUntil(timeoutMs, delayMsBetweenRetries, checkFunc) {
		let terminateAfter = Date.now() + timeoutMs;
		while (Date.now() < terminateAfter) {
			let result = await checkFunc();
			if (result) return result;
			await delay(delayMsBetweenRetries);
		}
		throw new Error('action timed out');
	}

	async function waitForApplication() {
		await retryUntil(4000, 100, () => document.getElementById("ppm_header_wait").style.display == 'none');
	}

	async function saveTimeSheet() {
		if (window.currentTimeSheetIsDirty) {
			// the current timesheet was modified -> save it before switching to a new timesheet
			submitForm('page','timeadmin.saveTimesheet');
			// wait for the save operation to complete
			await waitForApplication();
			window.currentTimeSheetIsDirty = false;
		}
	}

	async function fillTask(action) {
		console.log("fillTask", action);
		let actionDate = new Date(action.date);
		await retryUntil(60000, 500, async () => {
			// make sure we are on the timesheet edit page?
			if (! window.location.href.match(/nu#action:timeadmin\.editTimesheet/)) {
				console.log("returning to timesheet editor");
				document.getElementById('ppm_timesheet')?.click();
				return false;
			}
			
			// wait for the timesheet period selector to show up
			let timeSheetPeriodSelector = await retryUntil(4000, 100, () => document.getElementsByTagName("select").items().filter(e => e.name == 'timeperiod')?.singleOrDefault());
			
			// make sure the correct timesheet is selected
			// parse the selectable timesheets
			let timeSheetPeriods = Array.from(timeSheetPeriodSelector.getElementsByTagName('option'))
				.map((o, i) => ({g: o.textContent.match(/^(?<d1>\d+\/\d+\/\d+) - (?<d2>\d+\/\d+\/\d+)$/).groups, o, i}))
				.map(a => ({start: parseClarityDay(a.g.d1), end: parseClarityDay(a.g.d2), o: a.o, i: a.i}))
			let selectedTimeSheet = timeSheetPeriods[timeSheetPeriodSelector.selectedIndex];
			let thisDay = actionDate.dayIndex();
			// check if the timesheet period includes the desired day
			if (selectedTimeSheet.start > thisDay || selectedTimeSheet.end < thisDay) {
				// the wrong timesheet has been selected -> pick the right one
				console.log("wrong timesheet");
				let timeSheetOption = timeSheetPeriods.values().filter(a => a.start <= thisDay && a.end >= thisDay).singleOrDefault(null, RangeError);
				switch (timeSheetOption) {
					case null: throw new Error("unable to find the correct timesheet");
					case RangeError: throw new Error("ambiguous timesheet ranges encountered");
				}
				await saveTimeSheet();
				console.log("switching timesheet to " + timeSheetOption.o.textContent);
				timeSheetPeriodSelector.selectedIndex = timeSheetOption.i;
				timeSheetPeriodSelector.onchange();
				return false; // reattempt the process with the new timesheet selected
			}
			
			// make sure the timesheet table is showing
			let totalRows = await retryUntil(4000, 100, () => document.getElementsByTagName("tr").items().filter(e => e.className == 'total' && e.hasAttribute('data-ppm_odf_pk') && e.childElementCount > 1).singleOrDefault());
			await waitForApplication();
			// check if the timesheet can be edited ("Add Task" button exists)
			let addTasksButton = document.getElementsByTagName("button").items().filter(e => e.onclick?.toString().match(/submitForm.*'timeadmin\.timesheetAddTask'/i)).singleOrDefault();
			if (!addTasksButton) {
				console.warn(`unable to edit timesheet ${selectedTimeSheet.o.textContent}. Skipping task`, action);
				return true;
			}
			
			// try to locate the input field
			let lookup = actionDate.getDate().toString().padStart(2, '0') + '/' + (actionDate.getMonth() + 1).toString().padStart(2, '0') + ', ' + action.project + ', ' + action.task;
			let activityField = await retryUntil(20000, 500, async () => {
				let field = document.getElementsByTagName('input').items().filter(e => e.title.includes(lookup)).singleOrDefault(null, RangeError);
				if (field == null) {
					console.log("missing project " + action.project + " / task " + action.task);
					window.submitForm('page','timeadmin.timesheetAddTask');
					// wait for the search form fields to show up
					let applyFilter = await retryUntil(4000, 500, () => document.getElementsByTagName("button").items().filter(e => e.name === "applyFilter").singleOrDefault());
					let ff_task_name = await retryUntil(4000, 100, () => document.getElementsByTagName("input").items().filter(e => e.name === "ff_task_name").singleOrDefault());
					let ff_task_id = await retryUntil(4000, 100, () => document.getElementsByTagName("input").items().filter(e => e.name === "ff_task_id").singleOrDefault());
					let ff_assigned = await retryUntil(4000, 100, () => document.getElementsByTagName("select").items().filter(e => e.name === "ff_assigned").singleOrDefault());
					let ff_task_status = await retryUntil(4000, 100, () => document.getElementsByTagName("select").items().filter(e => e.name === "ff_task_status").singleOrDefault());
					let ff_project_type = await retryUntil(4000, 100, () => document.getElementsByTagName("select").items().filter(e => e.name === "ff_project_type").singleOrDefault());
					let ff_project_name = await retryUntil(4000, 100, () => document.getElementsByTagName("input").items().filter(e => e.name === "ff_project_name").singleOrDefault());
					let ff_project_id = await retryUntil(4000, 100, () => document.getElementsByTagName("input").items().filter(e => e.name === "ff_project_id").singleOrDefault());
					ff_task_name.value = action.task.replace("[", "[[]").replace("]", "[]]");
					ff_task_id.value = "";
					ff_assigned.value = "all";
					ff_task_status.value = "all";
					ff_project_type.value = "";
					ff_project_name.value = action.project;
					ff_project_id.value = "";
					applyFilter.click();
					// wait for the search results to be shown
					await retryUntil(8000, 500, () => window.location.href.match(/nu#action:timeadmin.selectTimesheetTask.*ff_task_status/));
					await waitForApplication();
					try {
						let addButton = await retryUntil(500, 100, () => document.getElementsByTagName("button").items().filter(e => e.onclick?.toString().match(/submitForm.*'timeadmin\.addTimesheetTask'/i)).singleOrDefault());
						// check all tasks and add them
						console.log("adding all found tasks");
						window.checkAll(this,'selectTimesheetTask.xsl','selitem');
						addButton.click();
						// after clicking the add button we should reattempt the entire process => return false to retry
						return false;
					} catch {
						let msg = "unable to find project " + action.project + " / task " + action.task;
						console.log(msg);
						alert(msg);
						throw new Error(msg);
					}
				} else if (field === RangeError) {
					throw new Error("ambiguous activity " + lookup);
				} else {
					return field;
				}
			});
			console.log("added " + action.hours + "h to " + lookup);
			activityField.value = action.hours;
			window.currentTimeSheetIsDirty = true;
			return true;
		});
	}

	function tryParseJSON(clipText) {
		try {
			return JSON.parse(clipText);
		} catch {
		}
	}

	function tryParseJSONL(clipText) {
		try {
			return clipText.split(/\r?\n/).map(line => JSON.parse(line));
		} catch {
		}
	}

	function tryParseMyTime(clipText) {
		let data = clipText
			.split(/\r?\n/)
			.values()
			.filter(line => line.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\t/))
			.map(line => line.match(/^(?<date>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})(\t[^\t]*\t[^\t]*\t{(?<project>[^\\]+)\\(?<task>[^}]+)}$)?/).groups)
			.pairs()
			.filter(pair => pair[1].project && pair[1].task)
			.map(pair => {
				let dt0 = new Date(pair[0].date);
				let dt1 = new Date(pair[1].date);
				return {date: dt1.toISOString().substr(0, 10), seconds: (dt1 - dt0)/1000, project: pair[1].project, task: pair[1].task}
			})
			.groupBy(t => [t.date, t.project, t.task], t => t.seconds)
			.map(grp => ({date: grp.key[0], project: grp.key[1], task: grp.key[2], hours: Math.round((grp.items.sum() + Number.EPSILON)/36)/100}))
			.toArray();
		if (data.length > 0) return data;
	}

	async function importFromClipboard() {
		let clipText = window.clipText = await navigator.clipboard.readText();
		for (let parser of [tryParseJSON, tryParseJSONL, tryParseMyTime]) {
			let tasks = parser(clipText);
			if (tasks && Array.isArray(tasks) && tasks.length > 0 && tasks.every(task => typeCheck(task, {date: 'string', project: 'string', task: 'string', hours: 'number'}))) {
				for (let task of tasks) await fillTask(task);
				await saveTimeSheet();
				alert("Import done");
				return;
			}
		}
		alert("unable to parse clipboard content");
	}

	let btn = window.document.getElementById('ClarityImport_btnPaste');
	if (!btn) {
		btn = window.document.getElementById("ppm_header_product").parentElement
			.createChild("td", {style: {verticalAlign: "middle", padding: "3px"}})
			.createChild("input", {type: "button", id: "ClarityImport_btnPaste", value: "Import from clipboard", style: {height: "25px"}});
	}
	btn.onclick = importFromClipboard;
}