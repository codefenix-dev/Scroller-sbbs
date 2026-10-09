Scroller
Version 0.261009

by Craig Hendricks
codefenix@conchaos.synchro.net

ConstructiveChaos BBS:
  https://conchaos.synchro.net
 telnet://conchaos.synchro.net
    ssh://conchaos.synchro.net



Description:

  This mod shows files to your users using a scrollable interface. 
  The user uses the up, down, page up, page down, home, and end keys 
  to scroll through the file.
  
  In addition to plain text files, it's also capable of displaying
  files containing ANSI as well as files containing CTRL-A colors, and 
  has support for iCE colors (i.e.: bright backgrounds) and font 
  switching (if the SAUCE data includes it), making it a great option 
  for viewing ANSI art and colorized bulletins. If an ANSI file is wider
  than the terminal width, then it can be scrolled horizontally with 
  the left & right keys.



Basic Instructions:

  Create the path:
  
    /sbbs/xtrn/scroller

  Now simply place the scroller.js, graphic.js, and frame.js files into it.
  
  That's it.
                             
  The InterBBS OneLiners (ibol.js), NewsCenter (newscenter.js), and 
  Digital Showroom (dsr.js) scripts are all designed to use scroller.js 
  as the default text viewer, falling back to Synchronet's standard 
  console output with page pauses if it's not present in the 
  /sbbs/xtrn/scroller path.
  
  The included graphic.js and frame.js files are modded versions of those 
  found in the official Synchronet project (/sbbs/exec/load). They've been
  modified to support 256-color ANSI files.
  
  Optionally, place the included text_sec.js file into /sbbs/mods to 
  use Scroller as your default text viewer for your General Text Files 
  section.
  
  If the user is not using ANSI, then Synchronet's standard console
  output with page pauses will be used by default.
  


Advanced Instructions:

  To utilize Scroller in your own scripts, the syntax is as follows:
  
    ?../xtrn/scroller/scroller.js <path_to_file> [title] [top/bottom]

    path_to_file: Required. This is the fully qualified path 
                  to the text file to be shown.
                  
           title: This is the title to display in the line above
                  the file viewer. If left blank, the filename 
                  (without the directory) is used by default.
                  
      top/bottom: This is the starting position in the file when
                  displayed. Default is "top" (the only valid 
                  value here is "bottom", and anything else results
                  in the file starting at the top).
                  
  You must wrap path_to_file and title in double-quotes if they 
  contain spaces.
  
  Example: 
  
  bbs.exec('?../xtrn/scroller/scroller.js "c:\\bbs_bull.txt" "Latest Bulletin" top');

  Colors can be changed by modifying the C1 and C2 variables near the
  top of the script. C1 is the main text in the top & bottom bars, and 
  C2 is the secondary text color for symbols and such. I plan to make 
  this more easily modifiable in the future, with optional unique configs 
  for each script that calls it.

  ANSI files containing a lot of cursor movement sequences are assumed 
  to be animations (i.e.: ANSImations), in which case they can optionally be 
  output to the console instead of the Scroller window with the 'p: play'
  option.
  
  Similarly, if Scroller detects any ANSI Music sequences in the file, it will
  give the option to play the ANSI Music.
   


Background and purpose:

  The idea for this script came about because I wanted an easy way to 
  let users view the InterBBS One Liner wall (IBOL) without having to 
  force the user to view the entire wall from the top, making them have
  to go through potentially many, many screen pauses to reach the end.
  
  Mystic BBS offers a nice scrollable text viewer out of the box, and I 
  wanted to do the same thing in Synchronet. While there *is* an optional 
  module for Synchronet (named bullshit) which does view files in such a 
  way very nicely, its true intent is for a selection of pre-defined 
  bulletins, rather than a single file on an ad hoc basis, which is what 
  I wanted.

  Once I got the basic logic working within IBOL, I realized it could be made
  portable and called by other scripts for displaying text files, and with
  not much more effort, would be nice for viewing ANSI files as well.
  
  I now use this as my main viewer for text and ANSI files all over my BBS.
  
  
  
Thanks & Greetz:

  Big thanks to the following for testing and providing feedback!
  
  StingRay @ A-Net Online:
    - a-net-online.lol  
    - mystic.a-net-online.lol 

  xbit @ The X-Bit BBS:
    - x-bit.org 

  Amessyroom @ Too Lazy BBS:
    - toolazy.synchro.net
    


Version History:  

v 0.261009 - Oct 9, 2026:

  + Shell out to xbimage.js for XB or XBIN files.
  + Expand LF to CRLF for files just containing LF (with lfexpand() function)
  + Added support for 256-color ANSI sequences. Requires 2 modded library 
    files: graphic.js and frame.js
  + Fixed "file_getext(file_name) is undefined" error for files without
    extensions.
  + The blinking cursor now gets hidden when displaying ANSI files containing
    animations.
  + P: Play option added for ANSI animations and ANSI music files.

v 0.250514 - May 14, 2025:

  + Improved detection for ANSI animations.
  + Added detection for ANSI music, file gets output to standard 
    console.printfile just like animations if detected.
  + Added important note regarding the graphic.js library to this readme file.
  + Fix to reset top and bottom margins in case an animation file changes them.

v 0.250509 - May 9, 2025:

  + Additional CTRL-A fixes to ensure proper color intensity.

v 0.250508 - May 8, 2025:

  + Fix for loss of CTRL-A colors while scrolling them out of range.

v 0.250410 - April 10, 2025:

  + Support for detecting files containing ANSI and loading it into a
    Graphic object.
  + Support for ANSI containing SAUCE data, for enabling iCE color mode
    and font switching (limited to Amiga Topaz).
  + Support for detecting ANSI file width and advising user accordingly.
  + Support for detecting cursor movements, and displaying the ANSI 
    animation if enough are detected.

v 0.20241105 - November 11, 2024:

  + Initial version. 
