/******************************************************************************
 * PSynth library
 *****************************************************************************/
(function() {

	var ns_synth = {

		WF_NONE: 0,
		WF_SIN:  1,
		WF_TRI:  2,
		WF_SAW:  4,
		WF_PLS:  8,
		WF_RND: 16,

		Ctrl: {
			// GENERAL
			amp: 	   0,

			// LFO
			lfo1fre:  10,
			lfo1amp:  11,
			lfo1wave: 12,

			lfo2fre:  20,
			lfo2amp:  21,
			lfo2wave: 22,

			// env
			env1amp:  30,
			env1dc:   31,
			env1atk:  32,
			env1dec:  33,
			env1sus:  34,
			env1rel:  35,

			env2amp:  40,
			env2dc:   41,
			env2atk:  42,
			env2dec:  43,
			env2sus:  44,
			env2rel:  45,

			osc1amp:  50,
			osc1dc:   51,
			osc1fre:  52,
			osc1note: 53,
			osc1tune: 54,
			osc1psw:  55,
			osc1wave: 56,

			osc2amp:  60,
			osc2dc:   61,
			osc2fre:  62,
			osc2note: 63,
			osc2tune: 64,
			osc2psw:  65,
			osc2wave: 66
		},

		theta: 2 * Math.PI,

		p2f: function(p) {
			// c = pow(2, 1/12); f = pow(c, pitch)*ref_freq
			var f = ((p == 0) ? 0.0 : (Math.pow(1.05946309436, p) * 20.60172230705));
			return f;
		},
		/******************************************************************************
		 * Prototype of a Potmeter (input element)
		 *****************************************************************************/
		Pot: function(min, max, value) {
			this.min = min;
			this.max = max;
			this.value = value;
		},

		/******************************************************************************
		 * Prototype of an envelope generator
		 *****************************************************************************/
		Env: function(parent, controls) {
			this.parent = parent;
			this.gate = 0;
			this.phase = 0;
			this.timer = 0;
			this.rate = 0;

			this.amp = controls.amp;
			this.dc  = controls.dc;
			this.atk = controls.atk;
			this.dec = controls.dec;
			this.sus = controls.sus;
			this.rel = controls.rel;
		},

		/******************************************************************************
		 * Prototype of an oscillator
		 *****************************************************************************/
		Osc: function(parent, controls) {
			this.parent = parent;
			this.timer = 0;
			this.smp = 0;
			
			this.amp = controls.amp;
			this.dc  = controls.dc;
			this.fre  = controls.fre;
			this.note = controls.note;
			this.tune = controls.tune;
			this.psw  = controls.psw;
			this.wave = controls.wave;
		},

		/******************************************************************************
		 * Prototype of a voice for polyphony
		 *****************************************************************************/
		Voice: function(parent) {
			this.velocity = new ns_synth.Pot(0, 1, 0);
			this.note = new ns_synth.Pot(0, 96, 0);
			// create a basic synth with 2 oscillators and 2 envelopes for AM
			this.envelopes = [ new ns_synth.Env(parent, parent.controls.env1), new ns_synth.Env(parent, parent.controls.env2) ];
			this.lfos = [ new ns_synth.Osc(parent, parent.controls.lfo1), new ns_synth.Osc(parent, parent.controls.lfo2) ];
			parent.controls.osc1.note = this.note; parent.controls.osc2.note = this.note;
			this.oscillators = [ new ns_synth.Osc(parent, parent.controls.osc1), new ns_synth.Osc(parent, parent.controls.osc2) ];
		},
		/******************************************************************************
		 * Prototype of a simple software synth
		 *****************************************************************************/
		Synth: function(smpRate, voiceCount) {
			this.smpRate = smpRate;
			this.omega = ns_synth.theta / smpRate;
			this.nextVoice = 0;
			// create controls
			this.controls = {
				amp: new ns_synth.Pot(0, 1, .8),
				env1: {
					amp: new ns_synth.Pot(0, 1, .5),
					dc:  new ns_synth.Pot(0, 1, .5),
					atk: new ns_synth.Pot(0, 1, .5),
					dec: new ns_synth.Pot(0, 1, .5),
					sus: new ns_synth.Pot(0, 1, .5),
					rel: new ns_synth.Pot(0, 1, .5),

				},
				env2: {
					amp: new ns_synth.Pot(0, 1, .5),
					dc:  new ns_synth.Pot(0, 1, .5),
					atk: new ns_synth.Pot(0, 1, .5),
					dec: new ns_synth.Pot(0, 1, .5),
					sus: new ns_synth.Pot(0, 1, .5),
					rel: new ns_synth.Pot(0, 1, .5)
				},
				lfo1: {
					amp: new ns_synth.Pot(0, 1, .5),
					dc:  new ns_synth.Pot(0, 1, .0),
					fre: new ns_synth.Pot(0, 1, .5),
					note: new ns_synth.Pot(0, 1, .0),
					tune: new ns_synth.Pot(0, 1, .0),
					psw: new ns_synth.Pot(0, 1, .5),
					wave: new ns_synth.Pot(0, 1, 1),
				},
				lfo2: {
					amp: new ns_synth.Pot(0, 1, .5),
					dc:  new ns_synth.Pot(0, 1, .0),
					fre: new ns_synth.Pot(0, 1, .5),
					note: new ns_synth.Pot(0, 1, .0),
					tune: new ns_synth.Pot(0, 1, .0),
					psw: new ns_synth.Pot(0, 1, .5),
					wave: new ns_synth.Pot(0, 1, 1),
				},
				osc1: {
					amp: new ns_synth.Pot(0, 1, .5),
					dc:  new ns_synth.Pot(0, 1, .5),
					fre: new ns_synth.Pot(0, 1, .5),
					note: null,
					tune: new ns_synth.Pot(0, 1, .5),
					psw: new ns_synth.Pot(0, 1, .5),
					wave: new ns_synth.Pot(0, 1, .5),
				},
				osc2: {
					amp: new ns_synth.Pot(0, 1, .5),
					dc:  new ns_synth.Pot(0, 1, .5),
					fre: new ns_synth.Pot(0, 1, .5),
					note: null,
					tune: new ns_synth.Pot(0, 1, .5),
					psw: new ns_synth.Pot(0, 1, .5),
					wave: new ns_synth.Pot(0, 1, .5),
				}
			};
			// create voices
			this.voices = [];
			for (var i=0; i<voiceCount; i++) {
				this.voices.push(new ns_synth.Voice(this));
			}
		}
	};
	/*****************************************************************************/
	ns_synth.Pot.prototype.set = function(value) {
		if (value > this.min) {
			if (value < this.max) {
				this.value = value;
			} else {
				this.value = this.max;
			}
		} else {
			this.value = this.min;
		}
		return this.value;
	}
	/*****************************************************************************/
	ns_synth.Env.prototype.setGate = function(v) {
		if (this.gate == 0) {
			if (v > 0) {
				// slope up: retrigger envelope
				this.phase = 1;
				this.timer = 0;
				this.gate = 1;
			}			
		} else {
			if (v <= 0) {
				// slope down: start release phase
				this.phase = 5;
				this.timer = this.sus;
				this.gate = 0;
			}
		}
	};
	ns_synth.Env.prototype.run = function(am) {
		var smp = 0;
		
		switch (this.phase) {
			case 1: // atk precalc
				// 0.0 : 0.005s -> 1/(0*3.995 + 0.005)/smpRate = 200/smpRate
				// 1.0 : 4.0s -> 1/(1*3.995 + 0.005)/smpRate
				//   X : Xs -> 1/(3.995*X + 0.005)/smpRate
				this.rate = 1/(this.parent.smpRate * (3.995 * this.atk.value + 0.005));
				this.phase++;
			case 2: // atk
				this.timer += this.rate;
				if (this.timer >= 1.0) {
					this.phase++;
					this.timer = 1.0;
				}
				//smp = smooth(this.timer);
				break;
			case 3:	// dec precalc
				// 0.0 : 0.005s -> 1/(0*3.995 + 0.005)/smpRate = 200/smpRate
				// 1.0 : 4.0s -> 1/(1*3.995 + 0.005)/smpRate
				//   X : Xs -> 1/(3.995*X + 0.005)/smpRate
				this.rate = 1/(this.parent.smpRate * (3.995 * this.dec.value + 0.005));
				this.phase++;
			case 4: // dec/sustain
				if (this.timer <= this.sus.value) {
					this.timer = this.sus.value;
				} else {
					this.timer -= this.rate;
					//var susm1 = 1- this.sus;
					//smp = susm1*smooth((this.timer-this.sus)/susm1) + this.sus;
				}
				break;
			case 5:	// rel precalc
				// 0.0 :  0.005s -> 1/(0*9.995 + 0.005)/smpRate = 200/smpRate
				// 1.0 : 10.0s -> 1/(1*9.995 + 0.005)/smpRate
				//   X :  Xs -> 1/(9.995*X + 0.005)/smpRate
				this.rate = 1/(this.parent.smpRate * (9.995 * this.rel.value + 0.005));
				this.phase++;
			case 6: // rel
				this.timer -= this.rate;
				if (this.timer <= 0.0) {
					this.phase = 0;	// set to idle
					this.timer = 0.0;
				}
				//smp = this.sus*smooth(this.timer/this.sus);
				break;
		}
		return am * this.timer;
	};
	/*****************************************************************************/
	ns_synth.Osc.prototype.run = function(am, fm, pm) {
		var pitch = this.note.value + this.tune.value;
		var delta = (this.fre.value + fm + ns_synth.p2f(pitch))/this.parent.smpRate;
		if (delta >= 1.0) {
			delta = 0.99999999;
		}
		var psw = pm + this.psw.value;
		var out = 0.0;
		var wf = this.wave.value;
		var wfc = 0;
		if ((wf & ns_synth.WF_SIN) != 0) {
			var arg = ns_synth.theta * this.timer;
			out += Math.sin(arg);
			wfc++;
		}
		if ((wf & ns_synth.WF_TRI) != 0) {
			var tmp = ((this.timer < psw) ? this.timer/psw : (1.0 - this.timer)/(1.0 - psw));
			out += 2*tmp - 1.0;
			wfc++;
		}
		if ((wf & ns_synth.WF_SAW) != 0) {
			out += ((this.timer < psw) ? 2.0 * this.timer/psw : 0.0);
			out -= 1.0;
			wfc++;
		}
		if ((wf & ns_synth.WF_PLS) != 0) {
			out += this.timer < psw ? 1.0 : -1.0;
			wfc++;
		}
		if ((wf & ns_synth.WF_RND) != 0) {
			if (this.timer < delta ||
				this.timer > 0.5 && this.timer < 0.5 + delta)
				this.smp = Math.random();
			out += this.smp;
			wfc++;
		}
		if (wfc > 1) {
			out /=  wfc;
		}
		if ((this.timer += delta) > 1.0) {
			this.timer -= 1.0;
		}
		return this.amp.value*am*out;
	};
	/*****************************************************************************/
	ns_synth.Voice.prototype.setNote = function(note, velocity) {
		this.note.value = note;
		for (var i=0; i<this.envelopes.length; i++) {
			this.envelopes[i].setGate(velocity);
		}
	};
	ns_synth.Voice.prototype.run = function() {
		// run LFOs
		var lfo1 = 1.0;	//1.0 - this.lfos[0].amp + (this.lfos[0].amp + this.lfos[0].run(1.0, 0.0, 0.0))/2;
		var lfo2 = this.lfos[1].run(1.0, 0.0, 0.0);
		// // run main oscillators
		var amp = this.envelopes[0].run(lfo1);
		var psw = 0.0;	//this.envelopes[1].run(1.0);
		var smp1 = this.oscillators[0].run(amp, lfo2, psw);
		var smp2 = this.oscillators[1].run(amp, lfo2, psw);
		return smp1 + smp2;
	};
	/*****************************************************************************/
	ns_synth.Synth.prototype.setup = function(values) {
		for (var i=0; i<values.length; i+=2) {
			var ctrlId = values[i];
			var key = Object.keys(ns_synth.Ctrl).find(
				function(k) {
					return ns_synth.Ctrl[k] == ctrlId;
				}
			);
			if (key === undefined) {
				console.log('No control with the id ' + ctrlId + ' was found!');
			}
			this.getControl(values[i]).value = values[i+1];
		}
	};
	ns_synth.Synth.prototype.getControl = function(controlId) {
		var pot = null;
		switch (controlId) {
			case ns_synth.Ctrl.amp: pot = this.controls.amp; break;
			// LFO
			case ns_synth.Ctrl.lfo1fre: pot = this.controls.lfo1.fre; break;
			case ns_synth.Ctrl.lfo1amp: pot = this.controls.lfo1.amp; break;
			case ns_synth.Ctrl.lfo1wave: pot = this.controls.lfo1.wave; break;

			case ns_synth.Ctrl.lfo2fre: pot = this.controls.lfo2.fre; break;
			case ns_synth.Ctrl.lfo2amp: pot = this.controls.lfo2.amp; break;
			case ns_synth.Ctrl.lfo2wave: pot = this.controls.lfo2.wave; break;

			// env
			case ns_synth.Ctrl.env1amp: pot = this.controls.env1.amp; break;
			case ns_synth.Ctrl.env1dc:  pot = this.controls.env1.dc; break;
			case ns_synth.Ctrl.env1atk: pot = this.controls.env1.atk; break;
			case ns_synth.Ctrl.env1dec: pot = this.controls.env1.dec; break;
			case ns_synth.Ctrl.env1sus: pot = this.controls.env1.sus; break;
			case ns_synth.Ctrl.env1rel: pot = this.controls.env1.rel; break;

			case ns_synth.Ctrl.env2amp: pot = this.controls.env2.amp; break;
			case ns_synth.Ctrl.env2dc:  pot = this.controls.env2.dc; break;
			case ns_synth.Ctrl.env2atk: pot = this.controls.env2.atk; break;
			case ns_synth.Ctrl.env2dec: pot = this.controls.env2.dec; break;
			case ns_synth.Ctrl.env2sus: pot = this.controls.env2.sus; break;
			case ns_synth.Ctrl.env2rel: pot = this.controls.env2.rel; break;

			// osc
			case ns_synth.Ctrl.osc1amp: pot = this.controls.osc1.amp; break;
			case ns_synth.Ctrl.osc1dc:  pot = this.controls.osc1.dc; break;
			case ns_synth.Ctrl.osc1fre: pot = this.controls.osc1.fre; break;
			case ns_synth.Ctrl.osc1note: pot = this.controls.osc1.note; break;
			case ns_synth.Ctrl.osc1tune: pot = this.controls.osc1.tune; break;
			case ns_synth.Ctrl.osc1psw: pot = this.controls.osc1.psw; break;
			case ns_synth.Ctrl.osc1wave: pot = this.controls.osc1.wave; break;

			case ns_synth.Ctrl.osc2amp: pot = this.controls.osc2.amp; break;
			case ns_synth.Ctrl.osc2dc:  pot = this.controls.osc2.dc; break;
			case ns_synth.Ctrl.osc2fre: pot = this.controls.osc2.fre; break;
			case ns_synth.Ctrl.osc2note: pot = this.controls.osc2.note; break;
			case ns_synth.Ctrl.osc2tune: pot = this.controls.osc2.tune; break;
			case ns_synth.Ctrl.osc2psw: pot = this.controls.osc2.psw; break;
			case ns_synth.Ctrl.osc2wave: pot = this.controls.osc2.wave; break;
			default: console.log('The control id ' + controlId + ' is invalid!'); break
		}
		return pot;
	};
	ns_synth.Synth.prototype.setNote = function(note, velocity) {
		// get free voice
		var voice = this.voices[this.nextVoice];
		//console.log('voice #' + this.nextVoice + ' - ' + note + '/' + velocity);
		this.nextVoice = (this.nextVoice + 1) % this.voices.length;
		voice.setNote(note, velocity);
	};
	ns_synth.Synth.prototype.run = function(buffer, start, end) {
		for (var i=start; i<end; i++) {
			var smp = 0;
			for (var j=0; j<this.voices.length; j++) {
				smp += this.voices[j].run();
			}
			buffer[i] = smp;
		}
	};

	module.exports = ns_synth;
})();
