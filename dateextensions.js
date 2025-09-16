function applyExtensions(win) {
	const msecsPerDay = win.Date.msecsPerDay = 86400000;
	const msecsPerHour = win.Date.msecsPerHour = 3600000;
	const msecsPerMinute = win.Date.msecsPerMinute = 60000;
	
	class DateZoneDetails {
		constructor(ts, y, m, d, w, h, min, s, f, z) {
			this.ts = ts;
			this.y = y;
			this.m = m;
			this.d = d;
			this.w = w;
			this.h = h;
			this.min = min;
			this.s = s;
			this.f = f;
			this.z = z;
		}
		
		hAmPm() {
			const mapped = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
			return mapped[this.h];
		}
		
		amPm() {
			return this.h < 12 ? 0 : 1;
		}
		
		format(template) {
			if (typeof(template) === 'string') {
				const mon4Pascal = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
				const mon3Pascal = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
				const dow4Pascal = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
				const dow3Pascal = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
				const dow2Pascal = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
				const ampmLower = ["am", "pm"];
				const ampmCaps = ["AM", "PM"];
				const dow4Caps = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNES", "THURSDAY", "FRIDAY", "SATURDAY"];
				const dow3Caps = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
				const dow2Caps = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
				return template
					.match(/(YYYY|YY|M{1,4}|D{1,2}|w{2,4}|W{2,4}|H{1,3}|h{1,2}|m{1,2}|s{1,2}|tt|TT|f{1,3}|.)/g)
					.map(f => {
						switch (f) {
							case "YYYY": return this.y;
							case "YY": return this.y % 100;
							case "MMMM": return mon4Pascal[this.m];
							case "MMM": return mon3Pascal[this.m];
							case "MM": return (this.m + 1).toString().padStart(2, "0");
							case "M": return this.m + 1;
							case "DD": return this.d.toString().padStart(2, "0");
							case "D": return this.d;
							case "wwww": return dow4Pascal[this.w];
							case "www": return dow3Pascal[this.w];
							case "ww": return dow2Pascal[this.w];
							case "WWWW": return dow4Caps[this.w];
							case "WWW": return dow3Caps[this.w];
							case "WW": return dow2Caps[this.w];
							case "HHH": return Math.trunc(this.ts / msecsPerHour);
							case "HH": return this.h.toString().padStart(2, "0");
							case "H": return this.h;
							case "hh": return this.hAmPm().toString().padStart(2, "0");
							case "h": return this.hAmPm();
							case "mm": return this.min.toString().padStart(2, "0");
							case "m": return this.min;
							case "ss": return this.s.toString().padStart(2, "0");
							case "s": return this.s;
							case "tt": return ampmLower[this.amPm()];
							case "TT": return ampmCaps[this.amPm()];
							case "fff": return this.f.toString().padStart(3, "0");
							case "ff": return Math.trunc(this.f / 10).toString().padStart(2, "0");
							case "f": return Math.trunc(this.f / 100);
							default: return f;
						}
					})
					.join("");
			}
			// otherwise treat template as object and expand every string element inside
			return Object.fromEntries(Object.entries(template).map(kvp => typeof(kvp[1]) !== 'string' ? kvp : [kvp[0], this.format(kvp[1])]));
		}
	}

	win.Date.prototype.midnight = function() {
		return new Date(Math.trunc(this.getTime() / Date.msecsPerDay) * Date.msecsPerDay);
	}

	win.Date.prototype.isSameDay = function(otherDate) {
		return Math.trunc(this.getTime() / Date.msecsPerDay) === Math.trunc(otherDate?.getTime() / Date.msecsPerDay);
	}

	// firstDayOfWeek 0..Sunday - 6..Saturday
	win.Date.prototype.getDayOfWeek = function(firstDayOfWeek) {
		return (this.getDay() - firstDayOfWeek + 7) % 7;
	}

	win.Date.diff = function(a, b) {
		return new Date(a)-new Date(b);
	}

	win.Date.prototype.getZoneDetails = function(timezone) {
		if (typeof(timezone) === 'undefined') { // use current timezone
			return new DateZoneDetails(this.getTime(), this.getFullYear(), this.getMonth(), this.getDate(), this.getDay(), this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds(), this.getTimezoneOffset());
		} else if (timezone === 0) {
			return new DateZoneDetails(this.getTime(), this.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate(), this.getUTCDay(), this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds(), this.getUTCMilliseconds(), 0);
		}
	}

	win.Date.prototype.formatUTC = function(template) {
		return this.getZoneDetails(0).format(template);
	}

	win.Date.prototype.format = function(template, zone) {
		return this.getZoneDetails(zone).format(template);
	}
}

applyExtensions(window);

module.exports = {
	applyExtensions
}