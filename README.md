# ghdl-interface package

This package uses command line tool ghdl and gtkwave software (both are free)
to compile and run VHDL codes directly from atom.
You'll need to install both softwares to get the best out of the plugin.

Pressing f8 runs a compilation of the current file.
Pressing f9 runs a compilation of the current file, the last testbench used,
and then runs the code, opening the resulting signals on gtkWave.
Pressing f10 opens a dialog that lets you select a new testbench for the
current file or run the code with the last one.

If there's not a previous selected testbench, it automatically assumes that
your testbench is named as the main code's file, with a _tb after the name

Example:
  Main file:  ANDgate.vhd
  TB file:    ANDgate_tb.vhd

Warning! Code will run successfuly if you use the run commands by having main
pane window as active pane.
