//fetch("https://raw.githubusercontent.com/gf-globalblue/globalblue/refs/heads/dev/sashelper.js").then(async r=>(async f=>0).constructor(await r.text())(r))
if (! window.require) await fetch(new URL(".", arguments[0].url).href + "modloader.js").then(r=>r.text().then(t=>new Function(t)(r)));

function makeTicketsClickable() {
	for (let tag of document.getElementsByTagName("a")) {
		if (/^CS\d+$/.exec(tag.innerText)) {
			for (let k of Object.keys(tag).filter(k => k.match(/^jQuery\d+$/) && tag[k].$scope?.$parent?.$parent?.item?.sys_id)) {
				tag.href = `/csm?id=csm_ticket&table=sn_customerservice_case&sys_id=${tag[k].$scope.$parent.$parent.item.sys_id}`;
				tag.style = "text-decoration: underline";
				tag.onclick = evt => evt.stopPropagation();
				break;
			}
		}
	}
}
makeTicketsClickable();