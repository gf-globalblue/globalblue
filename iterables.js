function applyExtensions(win) {
	// non-destructive sort with two supported modes:
	// 1. using a single field selector: <Array>.sortBy(a => a.value)
	// 2. using a comperator: <Array>.sortBy((a, b) => a.value - b.value)
	win.Array.prototype.sortBy = function(func) {
		let comparer = func.length === 1 ? ((a, b) => func(a) - func(b)) : func;
		return Array.from(this).sort(comparer);
	}
	
	win.Array.prototype.batch = function*(batchSize) {
		for (let i = 0; i < this.length; i += batchSize) {
			yield this.slice(i, i + batchSize);
		}
	}
	
	win.Array.prototype.first = function() {
		return this[0];
	}
	
	win.Array.prototype.last = function() {
		return this.at(-1);
	}
	
	win.Array.prototype.firstOrDefault = function(def) {
		return this.length > 0 ? this.first() : def;
	}
	
	win.Array.prototype.lastOrDefault = function(def) {
		return this.length > 0 ? this.last() : def;
	}
	
	win.Array.prototype.couples = function*() {
		for (let i = 1; i < this.length; i++) yield [this[i - 1], this[i]];
	}
	
	win.Array.prototype.removeItem = function(item) {
		this.splice(this.findIndex(a => a === item), 1);
	}
	
	// creates buckets. Example: .bucket({cond: (item,bucket)=>item.val>bucket.lastItem.val+10, map: a=>a.name}, ...)
	// <cond> is a function which defines when an item should be included in the current bucket
	// <map> is a function which defines how the item should transformed before being bucketed. (optional)
	// returns a 3 dimensional array - 1st dimension: one per rule, 2nd dimension: one per bucket, 3rd dimension: all items within a bucket
	win.Array.prototype.bucket = Iterator.prototype.bucket = function() {
		let rules = Array.from(arguments).map(arg => Object.assign({}, arg, {map: arg.map ?? function(a) { return a; }, buckets: []}));
		let isFirst = true;
		for (let item of this) {
			for (let rule of rules) {
				if (isFirst || !rule.cond(item, rule.buckets.lastBucket)) {
					rule.buckets.push(rule.buckets.lastBucket = []);
				}
				rule.buckets.lastBucket.push(rule.map(item));
				rule.buckets.lastBucket.lastItem = item;
			}
			isFirst = false;
		}
		return rules.map(rule => rule.buckets);
	}
	
	const Loop = win.Loop = class Loop {
		constructor(iter) {
			this.state = {current: undefined, previous: undefined};
			this.iter = iter[Symbol.iterator]();
			this.index = 0;
		}
		
		get value() {
			return this.state.current.value;
		}
		
		next() {
			let next = this.iter.next();
			if (next.done) return false;
			this.state.previous = this.state.current;
			this.state.current = { index: this.index++, value: next.value };
			return true;
		}
	}
	
	// segements an array into multiple whenever the condition is true
	win.Array.prototype.segment = Iterator.prototype.segment = function*(cond) {
		let loop = new Loop(this);
		loop.state.segment = [];
		if (loop.next()) {
			loop.state.segment.push(loop.value);
			while (loop.next()) {
				if (cond(loop.state)) {
					yield loop.state.segment;
					loop.state.segment = [];
				}
				loop.state.segment.push(loop.value);
			}
		}
		if (loop.state.segment.length > 0) yield loop.state.segment;
	}
	
	win.Iterator.prototype.batch = function*(batchSize) {
		for (let batch of this.segment(state => state.segment.length >= batchSize)) yield batch;;
	}
	
	win.Iterator.prototype.map = function*(selector) {
		for (let item of this) {
			yield (selector(item));
		}
	}
	
	win.Iterator.prototype.filter = function*(condition) {
		for (let item of this) {
			if (condition(item)) yield item;
		}
	}
	
	win.Iterator.prototype.toArray = function() {
		return Array.from(this);
	}
	
	win.Iterator.prototype.join = function() {
		return Array.from(this).join(...arguments);
	}
	
	win.Array.prototype.copyToClipboard = function() {
		copy(this.map(item => Array.isArray(item) ? item.join("\t") : item).join("\n"));
		console.log(`${this.length} lines have been copied to clipboard`);
	}
	
	win.Array.prototype.sum = function(selector) {
		if (typeof(selector) !== "function") selector = a => a;
		return this.reduce((a, i) => a += selector(i), 0);
	}
	
	win.Array.seq = function*(first, last, increment) {
		if (increment > 0) {
			for (let i = first; i <= last; i += increment) {
				yield i;
			}
		} else if (increment < 0) {
			for (let i = first; i >= last; i += increment) {
				yield i;
			}
		} else {
			throw new Error("invalid increment");
		}
	}
	
	win.Array.prototype.matchManyGroups = function() {
		return Object.assign({}, ...this.map(string => string.matchManyGroups(...arguments)));
	}
	
	win.Array.prototype.groupBy = Iterator.prototype.groupBy = function(selector) {
		let result = new Map();
		for (let item of this) {
			let key = selector(item);
			if (result.has(key)) {
				result.get(key).push(item);
			} else {
				result.set(key, [item]);
			}
		}
		return result;
	}

}

applyExtensions(window);

module.exports = {
	applyExtensions
}