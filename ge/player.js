var Player = Player || {};
/*****************************************************************************/

Player.Cmd_end = -1;
Player.Cmd_setTempo = 1;
Player.Cmd_assign = 2;

Player.Flg_active = 1;
Player.Flg_loop = 2;

/******************************************************************************
 * Prototype for the abstract player, base type for all players
 *****************************************************************************/
Player.AbstractAdapter = function() {
	this.id = 'Abstract';
	this.version = 1;
};
Player.AbstractAdapter.prototype.prepareObject = function(object) {
	// prepare object
};
Player.AbstractAdapter.prototype.processCommand = function(object, cmd) {
	// apply command on object
};
/******************************************************************************
 * Adapter of the player to handle channels, targets and sequences
 *****************************************************************************/
Player.PlayerAdapter = function() {
	this.id = 'Player';
	this.version = 1;
};
Player.PlayerAdapter.prototype = new Player.AbstractAdapter;

Player.PlayerAdapter.prototype.processCommand = function(player, cmd) {
	switch (cmd.cmd) {
		case Player.Cmd_setTempo:
			player.framesPerSecond = cmd.args[0];
			player.ticksPerFrame = cmd.args[1];
			break;
		case Player.Cmd_assign:
			var target = player.targets[cmd.args[0]];
			var sequence = player.sequences[cmd.args[1]];
			var status = cmd.args[2];
			// set channel
			var ix = player.channels.apply(function(i, args) {
				var ret = false;
				if ((this[i].status & Player.Flg_active) == 0) {
					this[i].set(target, sequence);
					ret = true;
				}
				return ret;
			});
			var ch;
			if (ix != -1) {
				// assign channel
				ch = player.channel[ix];
				ch.set(player, target, sequence);
			} else {
				// create new channel
				ch = new Player.Channel();
				player.channels.push(ch);
			}
			ch.set(player, target, sequence);
			ch.status = status;
			break;
	}
};

/******************************************************************************
 * Prototype of the Player object
 *****************************************************************************/
Player.Player = function(fps, tpf) {
	this.adapters = {};
	this.targets = [];
	this.channels = [];
	this.sequences = [];
	this.framesPerSecond = fps || 25;
	this.ticksPerFrame = tpf || 1;
	
	this.addAdapter(new Player.PlayerAdapter());
};
Player.Player.prototype.addAdapter = function(adapter) {
	// Look for an adapter with the same id
	var ad = this.adapters[adapter.id];
	// adapter not found or version is lower
	if (ad == null || ad.version < adapter.version) {
		this.adapters[adapter.id] = adapter;
	}
};
Player.Player.prototype.addTarget = function(object, adapter) {
	var ad = this.adapters[adapter.id];
	if (ad != null && ad.version >= adapter.version) {
		// add target
		var target = [object, ad];
		this.targets.push(target);
		if (!ad.prepareObject) {
			alert('gebasz');
		}
		ad.prepareObject(object);
	} else {
		throw 'Proper adapter version not found!';
	}
};
Player.Player.prototype.addSequence = function(sequence) {
	this.sequences.push(sequence);
	// the very first sequence is assigned to the master channel
	if (this.sequences.length == 1) {
		this.channels.push(new Player.Channel(this, [this, this.adapters.Player], this.sequences[0]));
		this.channels[0].status |= Player.Flg_active;
	}
};
Player.Player.prototype.run = function(delta) {
	//run every channel
	this.channels.apply(function(i, args) {
		if ((this[i].status & Player.Flg_active) != 0) {
			this[i].run(delta);
		}
	}, null);
};

/******************************************************************************
 * Prototype of the Command structure
 *****************************************************************************/
Player.Command = function(delta, cmd, args) {
	this.delta = delta || 0;
	this.cmd = cmd || 0;
	if (args != null) {
		this.args = args.clone();
	} else {
		this.args = null;
	}
};

/******************************************************************************
 * Prototype of the Channel structure
 *****************************************************************************/
Player.Channel = function(player, target, sequence) {
	this.set = function(player, target, sequence) {
		this.player = player;
		this.target = target;
		this.sequence = sequence;
		this.cursor = 0;
		this.status = 0;
		this.currentFrame = 0;
	};
	
	this.run = function(ticks) {
		if (this.currentFrame < this.sequence[this.cursor].delta) {
			// advance frame
			this.currentFrame += ticks;
		} else {
			this.currentFrame -= this.sequence[this.cursor].delta;
			// process command
			do {
				var cmd = this.sequence[this.cursor];
				if (cmd.cmd != Player.Cmd_end) {
					this.target[1].processCommand(this.target[0], cmd);
					this.cursor++;
				} else {
					if ((this.status & Player.Flg_loop) != 0) {
						// restart sequence
						this.cursor = 0;
						this.currentFrame = 0;
					} else {
						// reset channel
						this.status &= ~Player.Flg_active;
					}
				}
			} while (this.sequence[this.cursor].delta == 0);
		}
	};
	this.set(player, target, sequence);
}


