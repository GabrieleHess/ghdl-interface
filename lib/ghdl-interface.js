'use babel';

import GhdlInterfaceView from './ghdl-interface-view';
import { CompositeDisposable } from 'atom';
const child_process = require("child_process");

var file;
var TBfile = null;

export default {

  ghdlInterfaceView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.ghdlInterfaceView = new GhdlInterfaceView(state.ghdlInterfaceViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.ghdlInterfaceView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      //Pressing f8 compiles current file
      'ghdl-interface:compile_file': () => this.compile_file(),
      //Pressing f10 lets you choose whether you want to choose a
      // new testbench or run the compilation with the last one selected
      'ghdl-interface:run': () => this.run(),
      //Pressing f9 you can directly run the file with the last testbench
      // used
      'ghdl-interface:lastTb': () => this.lastTb()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.ghdlInterfaceView.destroy();
  },

  serialize() {
    return {
      ghdlInterfaceViewState: this.ghdlInterfaceView.serialize()
    };
  },

  run() {
    //Gets current file's filename
    file =  atom.workspace.getActiveTextEditor().getFileName();
    //Gets the project folder's path
    var folder = atom.project.getPaths();
    //If there's not a testbench file, automatically generates one
    if(TBfile == null) TBfile = folder + '/' + GenTbFileName(1);

    //Prompt a notification with options to run using the last testbench
    // (If not present an auto-generated one based on current file's name)
    // or you want to select a new one (whitch will be later saved as the
    // last one used)
    atom.notifications.addInfo('Select TestBench...',{
      buttons: [
        {
          className: "btn-info",
          onDidClick: () => this.addTb(),
          text: "Select TestBench"
        },
        {
          className: "btn-info",
          onDidClick: () => this.lastTb(),
          text: "Use " + TBfile
        }
      ],
      detail: "Select the TestBench you want to test this file with."
    });
  },

  compile_file() {
    //Compiles the current file
    //Get current file's filename
    file = atom.workspace.getActiveTextEditor().getFileName();
    //Get current file's absolute path
    var filePath = atom.workspace.getActiveTextEditor().getPath();
    //Get current project's absolute path
    var folder = atom.project.getPaths();
    //Shows a notification for compilation start
    atom.notifications.addInfo('Compilation started for \"' + file + '\"');

    //Generates a child process whitch will compile the current file
    var child = child_process.exec('ghdl -a \'' + filePath + '\'', {cwd: String(folder)});
    //If the compilation has errors, shows them in a notification
    child.stderr.on('data',
        function (data) {
            atom.notifications.addError('Error compiling', {detail: data});
        });
    //If the process ends whitout errors, shows a succesful notification
    child.on('exit',
        function(data){
          if(!data) atom.notifications.addSuccess('Compilation successful')
        });
  },

  addTb(){
    //Adds a new testbench to be used
    //Gets current project's folder
    var folder = atom.project.getPaths();
    //Calls function to select a new file with default directory
    // set as current project's one
    TBfile = pickFile(String(folder));

    //If the user cancel the selction (=> filename is null)
    // atom notifies thet no file has been selected
    // otherwise shows succes notification and calls
    // compilation and execution with lastTb function
    if(TBfile != null){
      atom.notifications.addSuccess('Selected ' + TBfile);
      this.lastTb();
    }
    else{
      atom.notifications.addWarning('No file selected');
    }
  },

  lastTb(){
    //Compiles and executes file with the last testbench selected
    //Sets file as current file's filename
    file = atom.workspace.getActiveTextEditor().getFileName();
    //Gets tb name whitout extension
    var TBfileNoExt = GenTbFileName(0);
    //Gets the absolute path of the main file
    var filePath = atom.workspace.getActiveTextEditor().getPath();
    //Gets folder path of current project
    var folder = atom.project.getPaths();

    //If the testbench is emty autogenerates one (Like run function)
    if(TBfile == null) TBfile = folder + '/' + GenTbFileName(1);

    //Motifies that simulation started
    atom.notifications.addSuccess('Simulation will start using ' + TBfile);

    //Starts a subprocess in whitch copiles main file, TestBench, executes TestBench
    // and runs simulation, by saving signal in a file called signals.vcd and
    // lastly opening it with GTKWave to view results of simulation
    var child = child_process.exec('ghdl -a \'' + filePath + '\' && ghdl -a \'' + TBfile +
                                  '\' && ghdl --elab-run \'' + TBfileNoExt + '\' --vcd=signal.vcd && gtkwave signal.vcd > /dev/null 2>&1', {cwd: String(folder)});
    //If encounters an error in the process, notifies it
    // if not, you'll see gtkwave pops up
    child.stderr.on('data',
        function (data) {
            atom.notifications.addError('Error', {detail: data});
        });
  }

};


/*****************************************************
* Function: pickFile
*
* Parameters: InitialPath -> String
*
* Return:     Path of selected file -> String
*
* Function lets you choose a file. Opens a file
* explorer dialog and by default sees only .vhd and
*.vhdl files, you can change that by selecting
* "All files" or adding a new filter in the list below.
*
*****************************************************/
function pickFile(InitialPath) {
    //Request a new file dialog from electron library
    var remote = require('electron').remote;
    //Opens a dialog on the initial path selected filtering for .vhd and .vhdl files
    var files = remote.dialog.showOpenDialog(remote.getCurrentWindow(), {defaultPath: InitialPath,
                                                                         filters: [
                                                                           {name: 'VHDL files', extensions: ['vhd', 'vhdl']},
                                                                           {name: 'All  files', extensions: ['*']}
                                                                         ],
                                                                         properties: ['openFile']});
    //If the filename is not empty and contains something
    if(files && files.length) {
        //Returns the filename
        return files[0];
    }
    //Otherwise returns null
    return null;
}

/*****************************************************
* Function: GetTbFileName
*
* Parameters: Extension -> Boolean variable
*               1 -> add same extension ad main file
*               0 -> doessn't add extension
*
* Return:    Name of the TestBench -> String
*
* The function takes the name of the file you are
* using it on, adds _tb at the end of it and if set,
* adds the extension (same one as the main file) at
* the end of the filename. It returns the filename
* with or without extension as a string.
*
* ATTENTION: function works assuming you give your
* testbench the same name as the main file adding
* _tb at the end of it.
*
* For example:
*    Main File:   ANDgate.vhd
*    Testbench:   ANDgate_tb.vhd
*
*****************************************************/
function GenTbFileName(Extension){
  //Temp string
  var TBfilea = [];
  var i;
  //Looks for the . before the extension
  for(i=0;file[i]!='.'; i++);
  var l;
  //Copies the filename until the extension in the temp string
  for(l=0; l<i; l++) TBfilea[l] = file[l];
  //Adds _tb after it
  TBfilea[l] = '_';
  TBfilea[l+1] = 't';
  TBfilea[l+2] = 'b';
  //If requeste8d, copies the extension at the end
  if(Extension == 1){
    l += 3;
    for(i; i<file.length; i++){
      TBfilea[l] = file[i];
      l++;
    }
  }
  //Returns the string containing the name of the tb file
  return TBfilea.join("");
}
