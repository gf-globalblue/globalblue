//fetch("https://raw.githubusercontent.com/gf-globalblue/globalblue/refs/heads/dev/blobsync.js").then(r=>r.text().then(t=>(async f=>0).constructor(t)(r)));
if (! window.require) await fetch(new URL(".", arguments[0].url).href + "modloader.js").then(r=>r.text().then(t=>new Function(t)(r)));
document.head.remove();
document.body.outerHTML = '<body><input type="button" value="sync" onclick="syncClick()"><pre class="content-area" id="log" style="overflow-y:scroll; background-color:#EEEEEE; height: calc(100vh - 50px)"></pre></body>'
document.title = `blobsync for ${document.location.origin}`;
if (!window.DirectorySync) {
	(async func => {
		await fetch("https://raw.githubusercontent.com/gf-globalblue/globalblue/refs/heads/dev/modloader.js").then(r=>r.text().then(t=>new Function(t)(r)));
		await require("blobdb.js");
	})();
}
async function syncClick() {
	let logElement = document.getElementById("log");
	window.dirSync = new DirectorySync({path: "scripts", handle: await window.showDirectoryPicker(), recurse: false, pattern: /\.js$/});
	window.dirSync.cbLog = msg => logElement.prepend(`${new Date().toISOString()} ${msg}\n`);
	window.monitor = window.dirSync.startMonitor(3000);
}
