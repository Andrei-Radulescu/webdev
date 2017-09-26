include('fw.js');

(function() {
	var ns_player = ns_player || {

		Cmd_end:	   -1,
		Cmd_setTempo:	1,
		Cmd_assign:		2,
		
		Flg_active:		1,
		Flg_loop:		2,
		
		/******************************************************************************
		 * Prototype for the abstract player, base type for all players
		 *****************************************************************************/
		AbstractAdapter: function() {
			this.id = 'Abstract';
			this.version = 1;
		},
		/******************************************************************************
		 * Adapter of the player to handle channels, targets and sequences
		 *****************************************************************************/
		PlayerAdapter: function() {
			this.id = 'Player';
			this.version = 1;
		},

		/******************************************************************************
		 * Prototype of the Player object
		 *****************************************************************************/
		Player: function(fps, tpf) {
			this.adapters = new fw.Map();
			this.targets = new fw.Array();
			this.channels = new fw.Array();
			this.sequences = new fw.Array();
			this.framesPerSecond = fps || 25;
			this.ticksPerFrame = tpf || 1;
			
			this.addAdapter(new ns_player.PlayerAdapter());
		},
		
		/******************************************************************************
		 * Prototype of the Command structure
		 *****************************************************************************/
		Command: function(delta, cmd, args) {
			this.delta = delta || 0;
			this.cmd = cmd || 0;
			if (args != null) {
				this.args = new fw.Array(args);
			} else {
				this.args = null;
			}
		},
		
		/******************************************************************************
		 * Prototype of the Channel structure
		 *****************************************************************************/
		Channel: function(player, target, sequence) {
			this.player = player;
			this.target = target;
			this.sequence = sequence;
			this.cursor = 0;
			this.status = 0;
			this.currentFrame = 0;
		}

	};

	ns_player.AbstractAdapter.prototype.prepareObject = function(object) {
		// prepare object
	};
	ns_player.AbstractAdapter.prototype.processCommand = function(object, cmd) {
		// apply command on object
	};
	ns_player.PlayerAdapter.prototype = new ns_player.AbstractAdapter;
	ns_player.PlayerAdapter.prototype.processCommand = function(player, cmd) {
		switch (cmd.cmd) {
			case ns_player.Cmd_setTempo:
				player.framesPerSecond = cmd.args[0];
				player.ticksPerFrame = cmd.args[1];
				break;
			case ns_player.Cmd_assign:
				var target = player.targets[cmd.args[0]];
				var sequence = player.sequences[cmd.args[1]];
				var status = cmd.args[2];
				// set channel
				var ix = player.channel.findIndex(function(i, args) {
					var ret = false;
					if ((this[i].status & ns_player.Flg_active) == 0) {
						this[i].set(target, sequence);
						ret = true;
					}
					return ret;
				});
				var ch = null;
				if (ix != -1) {
					// assign channel
					ch = channel[ix];
					ch.set(player, target, sequence);
				} else {
					// create new channel
					ch = new ns_player.Channel();
					channels.push(ch);
				}
				ch.set(player, target, sequence);
				ch.status = status;
				break;
		}
	};
	ns_player.Player.prototype.addAdapter = function(adapter) {
		// Look for an adapter with the same id
		var ad = this.adapters[adapter.id];
		// adapter not found or version is lower
		if (ad == null || ad.version < adapter.version) {
			this.adapters[adapter.id] = adapter;
		}
	};
	ns_player.Player.prototype.addTarget = function(object, adapter) {
		var ad = this.adapters[adapter.id];
		if (ad != null && ad.version >= adapter.version) {
			// add target
			this.targets.push([object, ad]);
			if (!ad.prepareObject) {
				throw 'Adapter has no prepareObject!';
			}
			ad.prepareObject(object);
		} else {
			throw 'Proper adapter version not found!';
		}
	};
	ns_player.Player.prototype.addSequence = function(sequence) {
		this.sequences.push(sequence);
		// the very first sequence is assigned to the master channel
		if (this.sequences.length == 1) {
			this.channels.push(new ns_player.Channel(this, [this, this.adapters.Player], this.sequences[0]));
			this.channels[0].status |= ns_player.Flg_active;
		}
	};
	ns_player.Player.prototype.run = function(delta) {
		//run every channel
		this.channels.apply(function(i, args) {
			if ((this[i].status & ns_player.Flg_active) != 0) {
				this[i].run(delta);
			}
		}, null);
	};
	ns_player.Command.prototype.reset = function(player, target, sequence) {
		this.player = player;
		this.target = target;
		this.sequence = sequence;
		this.cursor = 0;
		this.status = 0;
		this.currentFrame = 0;
	};
	ns_player.Command.prototype.run = function(ticks) {
		if (this.currentFrame < this.sequence[this.cursor].delta) {
			// advance frame
			this.currentFrame += ticks;
		} else {
			this.currentFrame -= this.sequence[this.cursor].delta;
			// process command
			do {
				var cmd = this.sequence[this.cursor];
				if (cmd.cmd != ns_player.Cmd_end) {
					this.target[1].processCommand(this.target[0], cmd);
					this.cursor++;
				} else {
					if ((this.status & ns_player.Flg_loop) != 0) {
						// restart sequence
						this.cursor = 0;
						this.currentFrame = 0;
					} else {
						// reset channel
						this.status &= ~ns_player.Flg_active;
					}
				}
			} while (this.sequence[this.cursor].delta == 0);
		}
	};

	module.exports = ns_player;
})();