/******************************************************************************
 * PSynth library
 *****************************************************************************/
(function() {

	var ns_psynth = ns_psynth || {

		WF_NONE: 0,
		WF_SIN:  1,
		WF_TRI:  2,
		WF_SAW:  4,
		WF_PLS:  8,
		WF_RND: 16,

		Ctrl: {
			// GENERAL
			amp: 	  1,	// master amplification

			// LFO
			Lfo1fre: 10,
			Lfo1amp: 11,
			Lfo1wav: 12,
			Lfo2fre: 13,
			Lfo2amp: 14,
			Lfo2wav: 15,

			// ENV
			Env1atk: 20,	// attack of envelope #1
			Env1dec: 21,	// decay of envelope #1
			Env1sus: 22,	// sustain of envelope #1
			Env1rel: 23,	// release of envelope #1
			Env1off: 24,	// offset of envelope #1
			Env1amp: 25,	// amplification of envelope #1

			Env2atk: 30,	// attack of envelope #2
			Env2dec: 31,	// decay of envelope #2
			Env2sus: 32,	// sustain of envelope #2
			Env2rel: 33,	// release of envelope #2
			Env2off: 34,	// offset of envelope #2
			Env2amp: 35,	// amplification of envelope #2

			Osc1fre: 40,	// frequency of oscillator #1
			Osc1amp: 41,	// amplitude of oscillator #1
			Osc1psw: 42,	// pulse width of oscillator #1
			Osc1wav: 43,	// waveform of oscillator #1
			Osc1tun: 44,	// tune of oscillator #1

			Osc2fre: 50,	// frequency of oscillator #2
			Osc2amp: 51,	// amplitude of oscillator #2
			Osc2psw: 52,	// pulse width of oscillator #2
			Osc2wav: 53,	// waveform of oscillator #2
			Osc2tun: 54,	// tune of oscillator #2
		},

		theta = 2 * Math.PI,

		p2f: function(p) {
			// c = pow(2, 1/12); f = pow(c, pitch)*ref_freq
			var f = ((p == 0) ? 0.0 : (Math.pow(1.05946309436, p) * 20.60172230705));
			return f;
		},

		/******************************************************************************
		 * Prototype of an envelope generator
		 *****************************************************************************/
		Env: function(parent) {
			this.parent = parent;
			this.gate = 0;
			this.phase = 0;
			this.timer = 0;

			this.atk = 0;
			this.dec = 0;
			this.sus = 0;
			this.rel = 0;
			this.off = 0;
			this.amp = 1;
		},

		/******************************************************************************
		 * Prototype of an oscillator
		 *****************************************************************************/
		Osc: function(parent) {
			this.parent = parent;
			this.timer = 0;
			this.fre = 0;
			this.note = 0;
			this.tune = 0;
			this.psw = 0;
			this.wave = WF_NONE;
		},

		/******************************************************************************
		 * Prototype of a simple software synth
		 *****************************************************************************/
		Synth: function(smpRate) {
			this.smpRate = smpRate;
			this.amp = 1;
			this.note = 0;
			this.gate = 0;
			this.lfos = [];
			this.envelopes = [];
			this.oscillators = [];
		}
	};

	Env.prototype.setGate = function(v) {
		if (this.gate == 0 && v > 0) {
			// slope up: retrigger envelope
			this.phase = 1;
			this.timer = 0;
			this.gate = 1;
			
		} else {
			if (this.gate > 0 && v <= 0) {
				// slope down: start release phase
				this.phase = 4;
				this.timer = this.sus;
				this.gate = 0;
			}
		}
	};
	Env.prototype.run = function(am) {
		var smp = 0;
		var rate = 0;
		
		if (this.phase > 0) {
			
			switch (this.phase) {
				case 1:	// atk
						// 0.0 : 0.005s -> 1/(0*3.995 + 0.005)/smpRate = 200/smpRate
						// 1.0 : 4.0s -> 1/(1*3.995 + 0.005)/smpRate
						//   X : Xs -> 1/(3.995*X + 0.005)/smpRate
					rate = 1/this.parent.smpRate/(3.995 * this.atk + 0.005);
					this.timer += rate;
					if (this.timer > 1.0) {
						this.phase++;
						this.timer = 1.0;
					}
					smp = this.timer;
					//smp = smooth(this.timer);
					break;
				case 2:	// dec/sustain
						// 0.0 : 0.005s -> 1/(0*3.995 + 0.005)/smpRate = 200/smpRate
						// 1.0 : 4.0s -> 1/(1*3.995 + 0.005)/smpRate
						//   X : Xs -> 1/(3.995*X + 0.005)/smpRate
					rate = 1/this.parent.smpRate/(3.995 * this.dec + 0.005);
					this.timer -= rate;
					if (this.timer > this.sus) {
						smp = this.timer;
						//var susm1 = 1- this.sus;
						//smp = susm1*smooth((this.timer-this.sus)/susm1) + this.sus;
					} else {
						smp = this.timer = this.sus;
					}
					break;
				case 4:	// rel
						// 0.0 :  0.005s -> 1/(0*9.995 + 0.005)/smpRate = 200/smpRate
						// 1.0 : 10.0s -> 1/(1*9.995 + 0.005)/smpRate
						//   X :  Xs -> 1/(9.995*X + 0.005)/smpRate
					rate = 1/this.parent.smpRate/(9.995 * this.rel + 0.005);
					this.timer -= rate;
					if (this.timer <= 0.0) {
						this.phase = 0;	// set to idle
						this.timer = 0.0;
					}
					smp = this.timer;
					//smp = this.sus*smooth(this.timer/this.sus);
					break;
			}
		}
		return smp;
	};

	Osc.prototype.run = function(am, fm, pm) {
		var pitch = this.note + this.tune;
		var delta = (this.fre + fm + p2f(pitch))/this.parent.smpRate;
		if (delta >= 1.0) {
			delta = 0.99999999;
		}
		var psw = pm + this.psw;
		var out = 0.0;
		var wf = this.wave;
		var wfc = 0;
		if ((wf & WF_SIN) != 0) {
			var arg = theta * this.timer;
			out += Math.sin(arg);
			wfc++;
		}
		if ((wf & WF_TRI) != 0) {
			var tmp = ((this.timer < psw) ? this.timer/psw : (1.0 - this.timer)/(1.0 - psw));
			out += 2*tmp - 1.0;
			wfc++;
		}
		if ((wf & WF_SAW) != 0) {
			out += ((this.timer < psw) ? 2.0 * this.timer/psw : 0.0);
			out -= 1.0;
			wfc++;
		}
		if ((wf & WF_PLS) != 0) {
			out += this.timer < psw ? 1.0 : -1.0;
			wfc++;
		}
		if ((wf & WF_RND) != 0) {
			if (this.timer < delta ||
				this.timer > 0.5 && this.timer < 0.5 + delta)
				smp = Math.random();
			out += smp;
			wfc++;
		}
		if (wfc > 1) {
			out /=  wfc;
		}
		if ((this.timer += delta) > 1.0) {
			this.timer -= 1.0;
		}
		return this.amp*am*out;
	};

	Synth.prototype.setup = function(values) {
		// create a basic synth with 2 oscillators and 2 envelopes for AM
		this.envelopes.push(new Env(this));
		this.envelopes.push(new Env(this));
		this.lfos.push(new Osc(this));
		this.lfos.push(new Osc(this));
		this.oscillators.push(new Osc(this));
		this.oscillators.push(new Osc(this));
		for (var i=0; i<values.length; i+=2) {
			this.setControl(values[i], values[i+1]);
		}
	};

	Synth.prototype.setControl = function(controlId, value) {
		switch (controlId) {
			case ns_psynthCtrl.amp: this.amp = value; break;
		
			case ns_psynthCtrl.Lfo1fre: this.lfos[0].fre = value; break;
			case ns_psynthCtrl.Lfo1amp: this.lfos[0].amp = value; break;
			case ns_psynthCtrl.Lfo1wav: this.lfos[0].wave = value; break;
			case ns_psynthCtrl.Lfo2fre: this.lfos[1].fre = value; break;
			case ns_psynthCtrl.Lfo2amp: this.lfos[1].amp = value; break;
			case ns_psynthCtrl.Lfo2wav: this.lfos[1].wave = value; break;
		
			case ns_psynthCtrl.Env1atk: this.envelopes[0].atk = value; break;
			case ns_psynthCtrl.Env1dec: this.envelopes[0].dec = value; break;
			case ns_psynthCtrl.Env1sus: this.envelopes[0].sus = value; break;
			case ns_psynthCtrl.Env1rel: this.envelopes[0].rel = value; break;
			case ns_psynthCtrl.Env1amp: this.envelopes[0].amp = value; break;
			case ns_psynthCtrl.Env1off: this.envelopes[0].off = value; break;

			case ns_psynthCtrl.Env2atk: this.envelopes[1].atk = value; break;
			case ns_psynthCtrl.Env2dec: this.envelopes[1].dec = value; break;
			case ns_psynthCtrl.Env2sus: this.envelopes[1].sus = value; break;
			case ns_psynthCtrl.Env2rel: this.envelopes[1].rel = value; break;
			case ns_psynthCtrl.Env2amp: this.envelopes[1].amp = value; break;
			case ns_psynthCtrl.Env2off: this.envelopes[1].off = value; break;

			case ns_psynthCtrl.Osc1fre: this.oscillators[0].fre = value; break;
			case ns_psynthCtrl.Osc1amp: this.oscillators[0].amp = value; break;
			case ns_psynthCtrl.Osc1psw: this.oscillators[0].psw = value; break;
			case ns_psynthCtrl.Osc1wav: this.oscillators[0].wave = value; break;
			case ns_psynthCtrl.Osc1tun: this.oscillators[0].tune = value; break;

			case ns_psynthCtrl.Osc2fre: this.oscillators[1].fre = value; break;
			case ns_psynthCtrl.Osc2amp: this.oscillators[1].amp = value; break;
			case ns_psynthCtrl.Osc2psw: this.oscillators[1].psw = value; break;
			case ns_psynthCtrl.Osc2wav: this.oscillators[1].wave = value; break;
			case ns_psynthCtrl.Osc2tun: this.oscillators[1].tune = value; break;
		}
	};
	Synth.prototype.setNote = function(note, velocity) {
		this.oscillators.apply(function(i, v) { this[i].note = v; }, note);
		this.envelopes.apply(function(i, v) { this[i].setGate(v); }, velocity);
	};
	Synth.prototype.setCtrl = function(id, value) {
		this.setControl(id, value);
	};

	//var counter = 0;
	//var tune = 0;
	Synth.prototype.run = function(buffer, count) {
		for (var i=0; i<count; i++) {
	//		if (counter == 0) {
	//			tune += 3;
	//			if (tune == 12) tune -= 12;
	//			_synth.setNote(24+tune, 0.7);
	//			counter = 48000/6;
	//		} else {
	//			if (counter == 3*48000/24) {
	//				_synth.setNote(24+tune, 0.0);
	//			}
	//		}
	//		counter--;
	//		// run LFOs
			var lfo1 = 1.0 - this.lfos[0].amp + (this.lfos[0].amp + this.lfos[0].run(1.0, 0.0, 0.0))/2;
			var lfo2 = this.lfos[1].run(1.0, 0.0, 0.0);
			// run main oscillators
			var amp = this.envelopes[0].run()*lfo1;
			var smp1 = this.oscillators[0].run(amp, lfo2, 0.0);
			var smp2 = this.oscillators[1].run(amp, lfo2, 0.0);
			buffer[i] = smp1 + smp2;
		}
	};

	return ns_psynth;
})();
