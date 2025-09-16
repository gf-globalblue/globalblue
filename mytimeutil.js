module.exports = {
	importToCoredat: async function(fileContent, timeSheetHelper) {
		let gridDate = timeSheetHelper.timeSheetWindow.timeGridCalendar.getDate();
		for (let act of __parse()) timeSheetHelper.writeEntry(
			act.date.midnight(),
			__formatTime(act.from),
			__formatTime(act.to),
			__getReason(act.category)
		);
		
		function __getReason(category) {
			/*
				['', '']
				['9072721', 'Business Trip - Telework ']
				['9072722', 'Business Trip - Travel ']
				['9072728', 'Home Office (Austrian resident working from abroad) ']
				['9072727', 'Home Office (in Austria) ']
				['9072729', 'Home Office (Non-Austrian resident working from their country of residence ']
				['9072725', 'On-Call Duty - Work performed ']
				['9103011', 'Rest from work ']
			*/
			switch (category) {
				case "HOMEOFFICE": return "9072727"
				case "TRAVEL": return "9072722"
			}
		}
		
		function * __parse() {
			let actions = new TextDecoder().decode(fileContent)
				.split("\r\n")
				.map(row => row.match(/^(?<dt>\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d)\t(?<action>[^\t]*)\t(.*\*\* *(?<category>.+?) *\*\*|).*?()?/i)?.groups)
				.filter(rec => rec)
				.map(rec => [new Date(rec.dt), rec])
				.filter(rec => rec[0].getYear() === gridDate.getYear() && rec[0].getMonth() === gridDate.getMonth())
				.sort((a, b) => a[0] - b[0])
				.map(rec => Object.assign(rec[1], ({_dt: rec[0]})));
			let block = __newBlock(actions[0]);
			for (let i = 1; i < actions.length; i++) {
				if (["COME", "PAUSE"].indexOf(actions[i].action) >= 0) {
					yield block;
					block = __newBlock(actions[i]);
				} else {
//					(block.actions ??= []).push(actions[i]);
					if (! block.to) block.category = actions[i].category;
					if (block.category === actions[i].category) {
						block.to = actions[i]._dt;
					} else {
						yield block;
						block = __newBlock(actions[i - 1], actions[i]);
					}
				}
			}
			yield block;
		}
		
		function __newBlock(startRecord, firstAction) {
			return {
				date: startRecord._dt,
				from: startRecord._dt,
				to: firstAction?._dt,
				category: firstAction?.category
			}
		}
		
		function __formatTime(dt) {
			if (!dt) return;
			let totMinutes = Math.round((dt - dt.getTimezoneOffset() * Date.msecsPerMinute - dt.midnight()) / Date.msecsPerMinute);
			let hour = Math.trunc(totMinutes / 60);
			let minute = totMinutes % 60;
			return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
		}
	}
}

