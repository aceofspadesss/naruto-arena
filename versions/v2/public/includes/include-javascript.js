var _____WB$wombat$assign$function_____=function(name){return (self._wb_wombat && self._wb_wombat.local_init && self._wb_wombat.local_init(name))||self[name];};if(!self.__WB_pmw){self.__WB_pmw=function(obj){this.__WB_source=obj;return this;}}{
let window = _____WB$wombat$assign$function_____("window");
let self = _____WB$wombat$assign$function_____("self");
let document = _____WB$wombat$assign$function_____("document");
let location = _____WB$wombat$assign$function_____("location");
let top = _____WB$wombat$assign$function_____("top");
let parent = _____WB$wombat$assign$function_____("parent");
let frames = _____WB$wombat$assign$function_____("frames");
let opens = _____WB$wombat$assign$function_____("opens");
function popup_image(setfilename,setwindowtitle,setwidth,setheight) {
	var win = window.open('','','border=0,toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=' + setwidth + ',height=' + setheight + '');
	with (win.document)
	{
	writeln("<html><head><title>" + setwindowtitle + "</title></head><body style='margin:0px;padding:0px;'><table width='83%' height='83%' cellpadding='0' cellspacing='0' border='0'><tr><td align='center'><img src='" + setfilename + "' border='0'></td></tr></table></body></html>");
	}
}

function popup_page(setfilename,setwindowtitle,setwidth,setheight) {
var win = window.open(setfilename,'','border=0,toolbar=0,scrollbars=1,location=0,statusbar=1,menubar=0,resizable=0,width=' + setwidth + ',height=' + setheight + '');
}

function redirect(linktogo){
	window.location = linktogo;
}

function create_cookie(name,value,seconds)
{
	if (days)
	{
		var date = new Date();
		date.setTime(date.getTime()+(days*24*60*60*1000));
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = name+"="+value+expires+"; path=/";
}

function read_cookie(name)
{
	var nameEQ = name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++)
	{
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

function erase_cookie(name)
{
	createCookie(name,"",-1);
}
}

/*
     FILE ARCHIVED ON 16:35:31 Apr 25, 2007 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 07:01:57 Feb 17, 2026.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  captures_list: 0.496
  exclusion.robots: 0.018
  exclusion.robots.policy: 0.008
  esindex: 0.009
  cdx.remote: 6.109
  LoadShardBlock: 429.191 (3)
  PetaboxLoader3.datanode: 430.031 (4)
  PetaboxLoader3.resolve: 123.632 (3)
  load_resource: 240.367
*/