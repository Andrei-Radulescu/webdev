(function() {

	include('player');

	ns_player.SynthAdapter = function() {
		this.id = 'SynthAdapter';
		this.version = 1;
	}
	ns_player.SynthAdapter.Cmd_setNote = 0;
	ns_player.SynthAdapter.Cmd_setCtrl = 1;

	ns_player.SynthAdapter.prototype = new ns_player.AbstractAdapter;
	ns_player.SynthAdapter.prototype.prepareObject = function(synth) {
		;
	};
	ns_player.SynthAdapter.prototype.processCommand = function(synth, cmd) {
		switch (cmd.cmd) {
			case ns_player.SynthAdapter.Cmd_setNote:
				synth.setNote(cmd.args[0], cmd.args[1]);
				break;
			case ns_player.SynthAdapter.Cmd_setCtrl:
				synth.setControl(cmd.args[0], cmd.args[1]);
				break;
		}
	};
	return ns_player;
})();