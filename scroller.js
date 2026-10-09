/*

Scroller                       ▄ ▄ ▄
for Synchronet                 █████
Version 0.261009               ▐▄█▄▌ cf
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
by Craig Hendricks
codefenix@conchaos.synchro.net

ConstructiveChaos BBS:
  https://conchaos.synchro.net
 telnet://conchaos.synchro.net
    ssh://conchaos.synchro.net

*/

load("sbbsdefs.js");
load("frame.js");
require("graphic.js", 'Graphic');
load("attr_conv.js");
var sauce = load({},"sauce_lib.js");

const C1 = "\x01n";      // primary text color
const C2 = "\x01w\x01h"; // secondary color, for symbols and such
const BAR_FG = BLACK;    // top and bottom bar default foreground color
const BAR_BG = BG_LIGHTGRAY; // top and bottom bar background color
const ANSI_SCROLLABLE_SIZE_LIMIT = 1000000;
const ANSI_CURSOR_MOVEMENT_LIMIT = 20;

var up_arrow = ascii(24);
var down_arrow = ascii(25);
var right_arrow = ascii(16);
var left_arrow = ascii(17);
var verti = ascii(18);
var horiz = ascii(29);
var contains_ctrl_a = false;

function convert_tilde_colors(str) {
    // Very similar to PCBoard / Wildcat format, but uses ~ instead of @
    if (str.search(/\~[0-9AF][0-9AF]/i) >= 0) {
        const fg=['\x01n\x01k','\x01n\x01b','\x01n\x01g','\x01n\x01c','\x01n\x01r','\x01n\x01m','\x01n\x01y','\x01n\x01w',
                  '\x01h\x01k','\x01h\x01b','\x01h\x01g','\x01h\x01c','\x01h\x01r','\x01h\x01m','\x01h\x01y','\x01h\x01w']; 
        const bg=['\x010','\x014','\x012','\x016','\x011','\x015','\x013','\x017'];
        for (var b=0; b < bg.length; b++)  {
            for (var f=0; f < fg.length; f++)  {                
                var tilde_code = new RegExp(format("\~%X%X", b, f), 'g');
                str = str.replace(tilde_code, bg[b] + fg[f]);
            }
        }
    }
    return str;
}

function init_display(opts) { // portions lifted from mrc-client.js
    const w = console.screen_columns;
    const h = console.screen_rows;
    const f = { top: new Frame(1, 1, w, h, BG_BLACK|LIGHTGRAY) };
    f.topbar = new Frame(1, 1, w, 1, BAR_BG|BAR_FG, f.top);
    f.viewport = new Frame(1, 2, w, h - 2, BG_BLACK|LIGHTGRAY, f.top);
    f.bottombar = new Frame(1, h, w, 1, BAR_BG|BAR_FG, f.top);
    f.viewport.word_wrap = true;
    f.bottombar.putmsg(opts);
    f.top.open();
    return f;
}

function viewfile(file_name, file_title, start_at) {
    var title = file_title ? file_title : file_getname(file_name);
    var ext = file_getext(file_name);
    var exit_viewer = false;
    var line_index;
    var col_index = 0;
    var file_lines = [];
    var graphic = null;
    var is_graphic = false;
    var content_height = 0;
    var content_width = 0;
    var max_lines;
    var max_cols = 0;
    var move_viewport = false;
    var ftxt = new File(file_name);
    var sdat = new sauce.read(file_name);
    var ansi_cursor_movement = 0;
    var animation_speed = "11";
    var ansi_music = false;
    var txt;
    var scol;
    var srow;
    if (ftxt.open("rb")) {       
        txt = ftxt.read().replace(/\f/g, "").replace(/\0/g, " "); // strip out problematic characters		
		if (txt.substr(0,4) === "XBIN") {
			bbs.exec( "?xbimage.js show \"" + file_name + "\"" );
			return;
		}
		
        if (str_is_utf8(txt)) {
            txt = utf8_decode(txt);
        }
        if (txt.search(/\x1a/i) >= 0) {                // only read up to the CTRL Z sequence, in case 
            txt = txt.substr(0, txt.search(/\x1a/i) ); // of sauce data included in plain text files.
        }
        ftxt.close();
        
        txt = wildcatAttrsToSyncAttrs(PCBoardAttrsToSyncAttrs(convert_tilde_colors(txt)));
        contains_ctrl_a = txt.search(/\x01[krgybmcwnh]/i) >= 0; // Detect CTRL-A codes     

        if (txt.indexOf("\x1b[") >= 0) { // Contains ANSI

            // account for sauce data with insane cols/rows values
            scol = (sdat.cols > 250 ? console.screen_columns : sdat.cols) || console.screen_columns;
            srow = (sdat.rows > 10 ? 10 : sdat.rows) || 10;
            
            if (sdat.title) {
                title = '"' + sdat.title.replace(/"/g, '') + '"' + (sdat.author ? (" by " + sdat.author + (sdat.group ? (" of " + sdat.group) : "") ) : "");
            }
            if (ext) {
                ext = ext.toUpperCase();
            }
            if (sdat.ice_color || ext === ".ICE" ) {
                print("\x1b[?33;35h"); // switch ice colors on...
                title = title + C1 + " (iCE mode)";
            }        
                       
            if (sdat.tinfos) {
                if (sdat.tinfos.search(/amiga|topaz/i) >= 0) { // switch to an "amiga" font if specified.
                    print("\x1b[0;40 D");                      // that's the only font we'll bother with.
                    up_arrow = "/\\";     // change the up and
                    down_arrow = "\\/"; // down characters on the bottom bar.
                    right_arrow = "->";
                    left_arrow = "<-";
                    verti = "v";
                    horiz = "h";
                }
            }    
                        
            ansi_cursor_movement = (txt.match(/\x1b\[[0-9;]*[0-9]*[Hf]/g) || []).length; // Detect animations (i.e.: LOTS of cursor movements)
            ansi_music = txt.search(/\x1b\[[0-T]*\x0e/) >= 0; // Detect ANSI music
            
            // Simply dump to console.printfile if the size or cursor movement count exceed the defined limits,
            // or if the file contains ANSI music, since we want to PLAY those things, and not try to scroll them.
            // (Color depth is no longer a reason to bypass scrolling - Frame/Graphic now carry 256-color/
            // truecolor data natively, so it's handled the same way as any other ANSI file below.)
            if (txt.length >= ANSI_SCROLLABLE_SIZE_LIMIT ) { // || ansi_cursor_movement >= ANSI_CURSOR_MOVEMENT_LIMIT || ansi_music) {
                console.clear(false);
                if (txt.length < 25000) {
                    animation_speed = "6"; // throttle speed down to 9600 for small files
                }
                printf("\x1b[;" + animation_speed + "*r");
				console.putmsg(txt, P_NOPAUSE | P_CPM_EOF | P_NOATCODES);				
                printf("\x1b[*r"); // reset speed
                printf("\x1b[1;"+console.screen_rows+"r"); // reset top and bottom margins, in case they were changed by a ESC[1;Xr sequence.
                console.gotoxy(1, console.screen_rows-1);
                console.pause();
                return;
            }
    
            graphic = new Graphic(scol, srow);
            graphic.auto_extend = true;
            graphic.ANSI = lfexpand(txt);
            graphic.width = scol - 1;
            is_graphic = true;
            content_height = graphic.height;
            content_width = graphic.width;

        } else {
            file_lines = lfexpand(txt).split(/\n/);
            content_height = file_lines.length;
        }        
    }
    const OPTS = " " + // options
     /* up    */ C1 + up_arrow + " " + C2 + "/ " +
     /* down  */ C1 + down_arrow + " " + C2 + "/ " +
     (scol > console.screen_columns ? (// add extra options if wider than the terminal
     /* left  */ C1 + left_arrow + " " + C2 + "/ " +
     /* right */ C1 + right_arrow + " " + C2 + "/ "
     ) : "") +
     /* pg-up */ C1 + "pgup " + C2 + "/ " +
     /* pg-dn */ C1 + "pgdn " + C2 + "/ " +
     /* home  */ C1 + "home " + C2 + "/ " +
     /* end   */ C1 + "end " + C2 + "/ " +
     (
    (ansi_cursor_movement >= ANSI_CURSOR_MOVEMENT_LIMIT || ansi_music) ? 
     /* play  */ C1 + "p" + C2 + ": " + C1 + "play " + C2 + "/ " : ""
     )  +
     /* quit  */ C1 + "q" + C2 + ": " + C1 + "quit";
    const frames = init_display(OPTS);
    frames.topbar.putmsg(C2 + "Loading " + C1 + title.substr(0, frames.topbar.width-15) + C2 + "...");
    frames.top.cycle();    
    max_lines = (content_height - frames.viewport.height < 1 ? 1 : content_height - frames.viewport.height)-1;
    line_index = start_at === "bottom" ? max_lines : 0;
    max_cols = is_graphic ? Math.max(content_width - frames.viewport.width, 0) : 0;

    function redraw_viewport() {
        if (is_graphic) {
            frames.viewport.putGraphic(graphic, col_index, line_index);
        } else {
			var lastCtrlAcodes = "";
			if (contains_ctrl_a) {        
				// find the last CTRL-A color codes before this line, and
				// prefix it to the return string. This should preserve
				// colors used before the section being shown in the 
				// scroll view.        
				for (var i = line_index-1; i >= 0 ; i--) {
					var matched = file_lines[i].match(/\x01[krgybmcwnh0-9]/ig);
					if (matched) {
						lastCtrlAcodes = matched.join('') + lastCtrlAcodes;                
						if (lastCtrlAcodes.search(/\x01[krgybmcw0-9]/i) >= 0 && lastCtrlAcodes.search(/\x01[nh]/i) >= 0) {                    
							break;
						}                
					}
				}        
			}			
			
            frames.viewport.clear();
            frames.viewport.putmsg(lastCtrlAcodes + file_lines.slice(line_index, line_index + frames.viewport.height).join("\n"));
        }
    }

    redraw_viewport();
    frames.viewport.scrollTo(0, 0);
    if (scol > console.screen_columns) {
        frames.bottombar.gotoxy( frames.bottombar.width-14, 1);
        frames.bottombar.putmsg( format( C1+C2+horiz+"["+C1+"%.3d%%"+C2+"]", (max_cols > 0 ? (col_index / max_cols) : 1) * 100) );
    }
    frames.bottombar.gotoxy(frames.bottombar.width-7, 1);
    frames.bottombar.putmsg(format( C1+C2+verti+"["+C1+"%.3d%%"+C2+"]", (max_lines > 0 ? (line_index / max_lines) : 1) * 100));
    frames.topbar.clear();
    frames.topbar.putmsg(C1 + "Viewing" + C2 + ": " + C1 + title.substr(0, frames.topbar.width-10));
    frames.top.cycle();
    while (bbs.online && !js.terminated && !exit_viewer) {
        switch (console.inkey().toUpperCase()) {
            case KEY_UP:
                line_index = line_index - 1;
                move_viewport = true;
                break;
            case KEY_DOWN:
                line_index = line_index + 1;
                move_viewport = true;
                break;
            case KEY_LEFT:
                col_index = col_index - 1;
                move_viewport = true;
                break;
            case KEY_RIGHT:
                col_index = col_index + 1;
                move_viewport = true;
                break;
            case KEY_PAGEUP:
                line_index = line_index - frames.viewport.height;
                move_viewport = true;
                break;
            case KEY_PAGEDN:
                line_index = line_index + frames.viewport.height;
                move_viewport = true;
                break;
            case KEY_HOME:
                line_index = 0;
                move_viewport = true;
                break;
            case KEY_END:
                line_index = max_lines;
                move_viewport = true;
                break;
            case "P":
                if (ansi_cursor_movement >= ANSI_CURSOR_MOVEMENT_LIMIT || ansi_music) {
                    console.putmsg("\x01q\x01l\x01n\x010");
                    if (txt.length < 25000) {
                        animation_speed = "6"; // throttle speed down to 9600 for small files
                    }
                    printf("\x1b[;" + animation_speed + "*r");
                    console.putmsg(txt, P_NOPAUSE | P_CPM_EOF | P_NOATCODES);				
                    printf("\x1b[*r"); // reset speed
                    printf("\x1b[1;"+console.screen_rows+"r"); // reset top and bottom margins, in case they were changed by a ESC[1;Xr sequence.
                    console.gotoxy(1, console.screen_rows);
                    console.pause();
                    exit_viewer = true;
                }
                break;
            case KEY_ESC:
            case "Q":
                exit_viewer = true;
                break;
        }
        if (move_viewport) {
            if (line_index < 0) {
                line_index = 0;
            } 
            if (line_index > max_lines) {
                line_index = max_lines;
            }
            if (col_index < 0) {
                col_index = 0;
            }
            if (col_index > max_cols) {
                col_index = max_cols;
            }
            redraw_viewport();
            frames.viewport.scrollTo(0, 0);
            frames.viewport.cycle();
            if (scol > console.screen_columns) {
                frames.bottombar.gotoxy( frames.bottombar.width-14, 1);
                frames.bottombar.putmsg( format( C1+C2+horiz+"["+C1+"%.3d%%"+C2+"]", (max_cols > 0 ? (col_index / max_cols) : 1) * 100) );
            }
            frames.bottombar.gotoxy( frames.bottombar.width-7, 1);
            frames.bottombar.putmsg( format( C1+C2+verti+"["+C1+"%.3d%%"+C2+"]", (max_lines > 0 ? (line_index / max_lines) : 1) * 100) );
            frames.bottombar.cycle();
            move_viewport = false;
        }
        yield();
    }
    frames.top.close();
}

function main(file_name, file_title, scroll_to_top) {
	printf("\x1b[?25l"); // hide the blinking cursor    
    if (file_exists(file_name)) {
        if (console.type==="ANSI") {
            viewfile(file_name, file_title, scroll_to_top ? scroll_to_top.toLowerCase() : "");
        } else {
            console.printfile(file_name);
        }
    } else {
        log(LOG_ERROR, "File not found: " + file_name);
    }    
    print("\x1b[?33;35l\x01q\x01l\x01n\x010\x1b[?25h\x1b[0;0 D"); // Resets iCE colors/blinking, clears screen, resets screen pause, resets colors, restores the blinking cursor, and resets font (if changed while rendering an ANSI file).
}

// 1: file path (string)
// 2: title (string; defaults to filename)
// 3: start at (string: top or bottom; defaults to top)

main(argv[0], argv[1], argv[2]);