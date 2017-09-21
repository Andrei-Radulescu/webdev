function SynthPlayer() {
	this.id = 'SynthPlayer';
	this.version = 1;
}

function setupSynthPlayer() {
	SynthPlayer.prototype = new Player.AbstractAdapter;
	SynthPlayer.prototype.prepareObject = function(synth) {
		;
	};
	SynthPlayer.prototype.processCommand = function(synth, cmd) {
		switch (cmd.cmd) {
			case SynthPlayer.Cmd_setNote:
				synth.setNote(cmd.args[0], cmd.args[1]);
				break;
			case SynthPlayer.Cmd_setCtrl:
				synth.setControl(cmd.args[0], cmd.args[1]);
				break;
		}
	};
}
SynthPlayer.Cmd_setNote = 0;
SynthPlayer.Cmd_setCtrl = 1;
