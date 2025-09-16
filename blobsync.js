(async func => {
	if (! window.require) await fetch(new URL(".", arguments[0].url).href + "modloader.js").then(r=>r.text().then(t=>new Function(t)(r)));
	await require("blobdb.js");
	dirSync = new DirectorySync({path: "scripts", handle: await window.showDirectoryPicker(), recurse: false}); //, pattern: /\.js$/});
	monitor = dirSync.startMonitor(3000);
	document.body?.remove();
	document.title = `blobsync for ${document.location.origin}`;
})();

// fetch("https://raw.githubusercontent.com/gf-globalblue/globalblue/refs/heads/dev/blobsync.js").then(r=>r.text().then(t=>new Function(t)(r)));