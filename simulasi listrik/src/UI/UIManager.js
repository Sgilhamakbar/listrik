// File: src/ui/UIManager.js

const UIManager = {
  currentZoom: 1,

setZoom(val, clientX = null, clientY = null) {
    const canvas = document.getElementById('canvas');
    const wrapper = document.getElementById('canvas-wrapper');
    if (!canvas || !wrapper) return;

    const oldZoom = this.currentZoom;
    const newZoom = Math.max(0.5, Math.min(parseFloat(val), 2.0));
    this.currentZoom = newZoom;

    const rect = wrapper.getBoundingClientRect();
    
    // Jika posisi jari tidak diberikan, zoom ke tengah layar
    if (clientX === null || clientY === null) {
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    }

    // 1. Catat koordinat absolut komponen yang sedang Anda tatap
    const canvasX = (wrapper.scrollLeft + clientX - rect.left) / oldZoom;
    const canvasY = (wrapper.scrollTop + clientY - rect.top) / oldZoom;

    // 2. Perbesar ukuran visual kanvas
    canvas.style.transform = `scale(${newZoom})`;
    canvas.style.transformOrigin = '0 0';

    // 🟢 FIX UTAMA: Buat elemen pendorong agar ruang scroll browser ikut membesar
    let spacer = document.getElementById('canvas-spacer');
    if (!spacer) {
        spacer = document.createElement('div');
        spacer.id = 'canvas-spacer';
        spacer.style.position = 'absolute';
        spacer.style.top = '0';
        spacer.style.left = '0';
        spacer.style.pointerEvents = 'none'; // Agar tidak mengganggu klik komponen
        spacer.style.visibility = 'hidden';
        wrapper.appendChild(spacer);
    }
    // Setel ukuran pendorong agar sama persis dengan skala kanvas
    spacer.style.width = (3000 * newZoom) + 'px';
    spacer.style.height = (3000 * newZoom) + 'px';

    // 3. Karena ruang scroll sudah luas, layar tidak akan terlempar lagi!
    wrapper.scrollLeft = canvasX * newZoom - (clientX - rect.left);
    wrapper.scrollTop = canvasY * newZoom - (clientY - rect.top);

    // Update teks persen di Toolbar
    const zoomLabel = document.getElementById('zoomLabel');
    if (zoomLabel) zoomLabel.innerText = Math.round(newZoom * 100) + '%';
    const zoomSlider = document.getElementById('zoomSlider');
    if (zoomSlider) zoomSlider.value = newZoom;
  },

  changeZoom(delta) {
    let newZoom = this.currentZoom + delta;
    if (newZoom >= 0.5 && newZoom <= 2.0) this.setZoom(newZoom);
  },

  initTheme() {
    const saved = localStorage.getItem('labCircuitTheme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateThemeButton(saved === 'dark');
  },

  updateThemeButton(isDark) {
    const btn = document.getElementById('btnTheme');
    if (btn) {
      btn.innerHTML = isDark
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
      btn.title = isDark ? 'Ganti ke Tema Terang' : 'Ganti ke Tema Gelap';
    }
  },

  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('labCircuitTheme', next);
    this.updateThemeButton(!isDark);
  },

  showToast(message, duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    // UBAH BAGIAN INI: Kosongkan isi container agar animasi tidak bertumpuk
    container.innerHTML = ''; 
    
    const toast = document.createElement('div');
    toast.className = 'toast'; 
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, duration);
  },

  showConfirmToast(message, onConfirm) {
    const existing = document.querySelector('.confirm-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'confirm-toast';
    toast.innerHTML = `<span>${message}</span><button id="confirmYes">Ya</button><button id="confirmNo">Batal</button>`;
    document.body.appendChild(toast);
    document.getElementById('confirmYes').onclick = () => { toast.remove(); if (onConfirm) onConfirm(); };
    document.getElementById('confirmNo').onclick = () => { toast.remove(); };
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 5000);
  },

openValueModal(compId, compType, subType) {
    CircuitStore.currentEditingComponent = { id: Number(compId), type: compType, subType: subType };
    const comp = document.getElementById(`comp-${compId}`);
    const compData = CircuitStore.components.find(c => c.id === Number(compId));
    if (!comp || !compData) return;

    let titleSuffix = subType ? ` (${subType.toUpperCase()})` : '';
    document.getElementById('valCompName').textContent = `${compType.toUpperCase()}${titleSuffix} - ID:${compId}`;
    const unitSelect = document.getElementById('compUnit');
    if (unitSelect) unitSelect.innerHTML = '';
    
    const fusePresets = document.getElementById('fusePresets');
    const resistorPresets = document.getElementById('resistorPresets');
    const capacitorPresets = document.getElementById('capacitorPresets');
    const batteryPresets = document.getElementById('batteryPresets');
    
    if (fusePresets) fusePresets.style.display = 'none';
    if (resistorPresets) resistorPresets.style.display = 'none';
    if (capacitorPresets) capacitorPresets.style.display = 'none';
    if (batteryPresets) batteryPresets.style.display = 'none'; 

    const isSlider = ['potentiometer', 'ldr', 'thermistor_ntc', 'thermistor_ptc'].includes(compType);
    const textInputGroup = document.getElementById('textInputGroup');
    const sliderInputGroup = document.getElementById('sliderInputGroup');
    const valCurrentWrapper = document.getElementById('valCurrentWrapper');
    const ledInputGroup = document.getElementById('ledInputGroup'); 
    const motorInputGroup = document.getElementById('motorInputGroup');
    const ntcInputGroup = document.getElementById('ntcInputGroup');
    const ptcInputGroup = document.getElementById('ptcInputGroup');
    const clockInputGroup = document.getElementById('clockInputGroup');
    const vsineInputGroup = document.getElementById('vsineInputGroup');
    const ffInputGroup = document.getElementById('ffInputGroup');
    const lampInputGroup = document.getElementById('lampInputGroup');
    const transformerInputGroup = document.getElementById('transformerInputGroup'); 

    const hideText = ['ldr', 'thermistor_ntc', 'thermistor_ptc', 'led', 'lamp', 'motor_dc', 'opamp', 'clock_pulse', 'vsine', 'ff_jk', 'ff_sr', 'ff_d', 'ff_t', 'transformer', 'transformer_2p2s'].includes(compType);
    const opampInputGroup = document.getElementById('opampInputGroup');
    
    if (textInputGroup) textInputGroup.style.display = hideText ? 'none' : 'flex';
    if (sliderInputGroup) sliderInputGroup.style.display = isSlider ? 'block' : 'none';
    if (valCurrentWrapper) valCurrentWrapper.style.display = hideText ? 'none' : 'block';
    if (ledInputGroup) ledInputGroup.style.display = compType === 'led' ? 'flex' : 'none';
    if (motorInputGroup) motorInputGroup.style.display = compType === 'motor_dc' ? 'flex' : 'none';
    if (opampInputGroup) opampInputGroup.style.display = compType === 'opamp' ? 'flex' : 'none';
    if (ntcInputGroup) ntcInputGroup.style.display = compType === 'thermistor_ntc' ? 'flex' : 'none';
    if (ptcInputGroup) ptcInputGroup.style.display = compType === 'thermistor_ptc' ? 'flex' : 'none';
    if (clockInputGroup) clockInputGroup.style.display = compType === 'clock_pulse' ? 'flex' : 'none';
    if (vsineInputGroup) vsineInputGroup.style.display = compType === 'vsine' ? 'flex' : 'none';
    if (ffInputGroup) ffInputGroup.style.display = compType.startsWith('ff_') ? 'flex' : 'none';
    if (lampInputGroup) lampInputGroup.style.display = compType === 'lamp' ? 'flex' : 'none';
    if (transformerInputGroup) transformerInputGroup.style.display = (compType === 'transformer' || compType === 'transformer_2p2s') ? 'flex' : 'none';
    
    if (compType === 'led') {
        document.getElementById('ledForwardV').value = compData.forwardV !== undefined ? compData.forwardV : 2.2;
        document.getElementById('ledFullDriveI').value = compData.fullDriveI !== undefined ? compData.fullDriveI : 10;
        document.getElementById('ledBreakdownV').value = compData.breakdownV !== undefined ? compData.breakdownV : 4.0;
        const ledColorSelect = document.getElementById('ledColor');
        if (ledColorSelect) ledColorSelect.value = compData.color || 'red';
    } else if (compType === 'lamp') {
        document.getElementById('lampRatedV').value = compData.ratedV !== undefined ? compData.ratedV : 12;
        document.getElementById('lampPowerW').value = compData.powerW !== undefined ? compData.powerW : 5;   
    } else if (compType === 'transformer' || compType === 'transformer_2p2s') {
        document.getElementById('trafoPriV').value = compData.priV !== undefined ? compData.priV : 220;
        document.getElementById('trafoSecV').value = compData.secV !== undefined ? compData.secV : 24;
    } else if (compType === 'motor_dc') {
        document.getElementById('motorRatedV').value = compData.ratedV !== undefined ? compData.ratedV : 12;
        document.getElementById('motorMaxRPM').value = compData.maxRpm !== undefined ? compData.maxRpm : 3000;
        document.getElementById('motorCoilR').value = compData.coilR !== undefined ? compData.coilR : 15;
    } else if (compType === 'opamp') {
        document.getElementById('opampPosRail').value = compData.posRail !== undefined ? compData.posRail : 15;
        document.getElementById('opampNegRail').value = compData.negRail !== undefined ? compData.negRail : -15;
    } else if (compType === 'vsine') {
        document.getElementById('vsineAmp').value = compData.customValue !== undefined ? compData.customValue : 12;
        document.getElementById('vsineFreq').value = compData.freqValue !== undefined ? compData.freqValue : 1;
        document.getElementById('vsineOffset').value = compData.dcOffset !== undefined ? compData.dcOffset : 0;
        document.getElementById('vsineDelay').value = compData.timeDelay !== undefined ? compData.timeDelay : 0;
    }
    if (compType === 'thermistor_ntc') {
        document.getElementById('ntcR25').value = compData.r25 !== undefined ? compData.r25 : 10000;
        document.getElementById('ntcBeta').value = compData.beta !== undefined ? compData.beta : 3950;
    } else if (compType === 'thermistor_ptc') {
        document.getElementById('ptcR25').value = compData.r25 !== undefined ? compData.r25 : 100;
        document.getElementById('ptcAlpha').value = compData.alpha !== undefined ? compData.alpha : 0.05;
    }
    if (compType === 'clock_pulse') {
        document.getElementById('clockFreq').value = compData.freqValue !== undefined ? compData.freqValue : 2;
        document.getElementById('clockInitial').value = compData.initialState !== undefined ? compData.initialState : '0';
    }
    if (compType.startsWith('ff_')) {
        document.getElementById('ffInitial').value = compData.initialState !== undefined ? compData.initialState : '0';
        document.getElementById('ffDelay').value = compData.propDelay !== undefined ? compData.propDelay : 0;
    }
    if (isSlider) {
      const compSlider = document.getElementById('compSlider');
      // Setel batas Minimum dan Maksimum secara dinamis!
      if (compType.startsWith('thermistor')) {
          compSlider.min = -40;
          compSlider.max = 150;
      } else {
          compSlider.min = 0;  // Untuk LDR & Potensiometer
          compSlider.max = 100;
      }
      let val = parseInt(compData.state || '50');
      compSlider.value = val;
      document.getElementById('sliderValueDisplay').innerText = val;
      if (compType.startsWith('thermistor')) document.getElementById('sliderUnit').innerText = ' °C (Suhu)';
      else if (compType === 'ldr') document.getElementById('sliderUnit').innerText = ' % (Cahaya)';
      else document.getElementById('sliderUnit').innerText = ' % (Putaran)';
    }
    if (!hideText) {
      // --- LOGIKA MEMBACA NILAI KOMPONEN (DIPERBAIKI) ---
      // BUGFIX: sebelumnya defaulting nilai null hanya menangani 'fuse' dan
      // ditaruh di cabang yang sama dengan penentuan tampilan baterai (if/else if),
      // sehingga baterai/power_terminal dengan customValue null tidak pernah
      // menampilkan preset & nilainya. Sekarang defaulting dipisah dari tampilan.
      let val = compData.customValue;
      if (compType === 'voltage_divider') {
          val = subType === 'r1' ? (compData.r1Value || 10000) : (compData.r2Value || 10000);
      } else if (val == null) {
        if (compType === 'fuse') val = 10;
        else if (compType === 'resistor') val = 330;
        else if (compType === 'potentiometer') val = 10000; 
        else if (compType === 'capacitor') val = 10;
        else if (compType === 'battery_1cell') val = 1.5;
        else if (compType.startsWith('battery') || compType === 'power_terminal') val = 12;
      }
      else if (compType === 'thermistor_ntc') {
        const r25 = parseFloat(document.getElementById('ntcR25').value);
        const beta = parseFloat(document.getElementById('ntcBeta').value);
        if (isNaN(r25) || isNaN(beta) || r25 <= 0) return this.showToast('Error: Nilai R25 harus lebih dari 0 Ohm!');
        compData.r25 = r25;
        compData.beta = beta;
    } 
    else if (compType === 'thermistor_ptc') {
        const r25 = parseFloat(document.getElementById('ptcR25').value);
        const alpha = parseFloat(document.getElementById('ptcAlpha').value);
        if (isNaN(r25) || isNaN(alpha) || r25 <= 0) return this.showToast('Error: Nilai R25 harus lebih dari 0 Ohm!');
        compData.r25 = r25;
        compData.alpha = alpha;
    }
      if (compType.startsWith('battery') || compType === 'power_terminal') {
        if (unitSelect) unitSelect.innerHTML = '<option value="1">V (Volt)</option>';
        document.getElementById('valCurrent').textContent = `${val} V`;
        if (batteryPresets) batteryPresets.style.display = 'block';
      }
      if (compType === 'fuse') {
        if (unitSelect) unitSelect.innerHTML = '<option value="1">A (Ampere)</option>';
        document.getElementById('valCurrent').textContent = `${val} A`;
        if (fusePresets) fusePresets.style.display = 'block';
      } else if (compType === 'resistor' || compType === 'voltage_divider' || compType === 'potentiometer') {
        if (unitSelect) unitSelect.innerHTML = '<option value="1">Ω</option><option value="1000">kΩ</option><option value="1000000">MΩ</option>';
        if (val >= 1000000) { if (unitSelect) unitSelect.value = "1000000"; document.getElementById('compValue').value = val/1000000; }
        else if (val >= 1000) { if (unitSelect) unitSelect.value = "1000"; document.getElementById('compValue').value = val/1000; }
        else { if (unitSelect) unitSelect.value = "1"; document.getElementById('compValue').value = val; }
        document.getElementById('valCurrent').textContent = `${val >= 1000000 ? (val/1000000)+' MΩ' : (val >= 1000 ? (val/1000)+' kΩ' : val+' Ω')}`;
        if (resistorPresets) resistorPresets.style.display = 'block';
      } else if (compType === 'capacitor') {
        if (unitSelect) unitSelect.innerHTML = '<option value="1">µF</option><option value="1000">mF</option><option value="1000000">F</option>';
        if (val >= 1000000) { if (unitSelect) unitSelect.value = "1000000"; document.getElementById('compValue').value = val/1000000; }
        else if (val >= 1000) { if (unitSelect) unitSelect.value = "1000"; document.getElementById('compValue').value = val/1000; }
        else { if (unitSelect) unitSelect.value = "1"; document.getElementById('compValue').value = val; }
        document.getElementById('valCurrent').textContent = `${val >= 1000 ? (val/1000)+' mF' : val+' µF'}`;
        if (capacitorPresets) capacitorPresets.style.display = 'block';
      }
      if (compType === 'fuse' || compType.startsWith('battery') || compType === 'power_terminal') {
    document.getElementById('compValue').value = val; }
    }

    document.getElementById('valueModal').classList.add('show');
    if (!isSlider) document.getElementById('compValue').focus();
  },

  setPresetValue(val, multiplier) {
    document.getElementById('compValue').value = val;
    const unitSelect = document.getElementById('compUnit');
    if (unitSelect && unitSelect.options.length > 1) { 
      unitSelect.value = multiplier; 
    }
  },

  saveComponentValue() {
    if (!CircuitStore.currentEditingComponent) return;
    const compType = CircuitStore.currentEditingComponent.type;
    const compId = CircuitStore.currentEditingComponent.id;
    const compData = CircuitStore.components.find(c => c.id === compId);
    const comp = document.getElementById(`comp-${compId}`);

    // 🟢 1. REKAM DATA LAMA SEBELUM DIUBAH (Deep Copy)
    const oldData = JSON.parse(JSON.stringify({ ...compData, element: undefined }));

    let raw, unit;
    if (!['ldr', 'thermistor_ntc', 'thermistor_ptc', 'led', 'lamp', 'motor_dc', 'opamp', 'clock_pulse', 'vsine', 'ff_jk', 'ff_sr', 'ff_d', 'ff_t', 'transformer', 'transformer_2p2s'].includes(compType)) {
        raw = parseFloat(document.getElementById('compValue').value);
      const unitSelect = document.getElementById('compUnit');
      unit = unitSelect ? (parseFloat(unitSelect.value) || 1) : 1;

      if (isNaN(raw)) return this.showToast('Masukkan angka yang valid!');
      if (raw <= 0 && !['power_terminal', 'battery', 'battery_1cell', 'battery_multi', 'vsine'].includes(compType)) 
        return this.showToast('Nilai komponen pasif tidak boleh minus atau nol!');
    }
    if (compType === 'led') {
        const fv = parseFloat(document.getElementById('ledForwardV').value);
        if (isNaN(fv) || fv < 0) return this.showToast('Masukkan nilai LED yang valid!');
    }
    else if (compType === 'vsine') {
        const amp = parseFloat(document.getElementById('vsineAmp').value);
        const freq = parseFloat(document.getElementById('vsineFreq').value);
        const offset = parseFloat(document.getElementById('vsineOffset').value);
        const delay = parseFloat(document.getElementById('vsineDelay').value);
        if (isNaN(amp) || isNaN(freq) || isNaN(offset) || isNaN(delay)) return this.showToast('Masukkan angka yang valid untuk V-Sine!');
        if (freq <= 0) return this.showToast('Error: Frekuensi harus lebih dari 0 Hz!');
        if (amp < 0) return this.showToast('Error: Amplitudo tidak boleh minus!');
        compData.customValue = amp; compData.freqValue = freq; compData.dcOffset = offset; compData.timeDelay = delay;
    }
    else if (compType === 'thermistor_ntc') {
        const r25 = parseFloat(document.getElementById('ntcR25').value);
        const beta = parseFloat(document.getElementById('ntcBeta').value);
        if (isNaN(r25) || isNaN(beta) || r25 <= 0) return this.showToast('Error: Nilai R25 harus lebih dari 0 Ohm!');
        compData.r25 = r25; compData.beta = beta;
    } 
    else if (compType === 'thermistor_ptc') {
        const r25 = parseFloat(document.getElementById('ptcR25').value);
        const alpha = parseFloat(document.getElementById('ptcAlpha').value);
        if (isNaN(r25) || isNaN(alpha) || r25 <= 0) return this.showToast('Error: Nilai R25 harus lebih dari 0 Ohm!');
        compData.r25 = r25; compData.alpha = alpha;
    }
    else if (compType === 'clock_pulse') {
        const freq = parseFloat(document.getElementById('clockFreq').value);
        if (isNaN(freq) || freq <= 0) return this.showToast('Error: Frekuensi harus lebih dari 0 Hz!');
        compData.freqValue = freq;
        compData.initialState = document.getElementById('clockInitial').value;
        if (!CircuitStore.isSimulationActive) compData.state = compData.initialState;
    }
    else if (compType.startsWith('ff_')) {
        const delay = parseFloat(document.getElementById('ffDelay').value);
        if (isNaN(delay) || delay < 0) return this.showToast('Error: Waktu rambat tidak boleh minus!');
        compData.propDelay = delay;
        compData.initialState = document.getElementById('ffInitial').value;
        // Terapkan langsung secara visual jika simulasi sedang dalam keadaan mati
        if (!CircuitStore.isSimulationActive) {
            compData.outputState = parseInt(compData.initialState);
            compData.targetState = compData.outputState;
        }
    }
    
    // 🟢 2. TERAPKAN PERUBAHAN KE COMPDATA
    if (['potentiometer', 'ldr', 'thermistor_ntc', 'thermistor_ptc'].includes(compType)) {
      compData.state = document.getElementById('compSlider').value;
      if (compType === 'potentiometer') compData.customValue = raw * unit;
    } else if (compType === 'led') {
      const ledColorSelect = document.getElementById('ledColor');
      if (ledColorSelect) compData.color = ledColorSelect.value;
      compData.forwardV = parseFloat(document.getElementById('ledForwardV').value);
      compData.fullDriveI = parseFloat(document.getElementById('ledFullDriveI').value);
      compData.breakdownV = parseFloat(document.getElementById('ledBreakdownV').value);
      if (compData.state === 'blown') { compData.state = '0'; if (comp) comp.dataset.state = '0'; }
    } else if (compType === 'lamp') {
      const rV = parseFloat(document.getElementById('lampRatedV').value);
      const pW = parseFloat(document.getElementById('lampPowerW').value);
      if (isNaN(rV) || isNaN(pW) || rV <= 0 || pW <= 0) return this.showToast('Error: Tegangan dan Daya Lampu harus lebih dari 0!');
      compData.ratedV = rV;
      compData.powerW = pW;
      // Jika sebelumnya lampu putus (meledak), pengguna bisa me-reset-nya dengan membuka modal dan menekan Simpan
      if (compData.state === 'blown') { 
          compData.state = '0'; 
          compData.hasWarned = false; // Reset peringatan agar bisa muncul lagi
          if (comp) comp.dataset.state = '0'; }  
    } else if (compType === 'transformer' || compType === 'transformer_2p2s') {
      // TAMBAHAN BARU: Simpan pengaturan Trafo ke memori
      const pV = parseFloat(document.getElementById('trafoPriV').value);
      const sV = parseFloat(document.getElementById('trafoSecV').value);
      if (isNaN(pV) || isNaN(sV) || pV <= 0 || sV <= 0) return this.showToast('Error: Tegangan Trafo tidak boleh minus atau nol!');
      compData.priV = pV;
      compData.secV = sV;    
      if (typeof HistoryManager !== 'undefined') {
          HistoryManager.pushCommand('CHANGE_PARAM', null, 'Ubah Pengaturan Trafo');
          HistoryManager.autoSaveToLocalStorage();
      }  
    } else if (compType === 'motor_dc') {
      compData.ratedV = parseFloat(document.getElementById('motorRatedV').value);
      compData.maxRpm = parseFloat(document.getElementById('motorMaxRPM').value);
      compData.coilR = parseFloat(document.getElementById('motorCoilR').value);
    } else if (compType === 'opamp') {
        const pr = parseFloat(document.getElementById('opampPosRail').value);
        const nr = parseFloat(document.getElementById('opampNegRail').value);
        if (isNaN(pr) || isNaN(nr) || pr <= nr) return this.showToast('Error: V+ (Positif) harus lebih besar dari V- (Negatif)!');
        compData.posRail = pr; compData.negRail = nr;
    } else if (compType === 'vsine' || compType === 'clock_pulse') {    
    } else {
      let finalVal = raw * unit;
      if (!['fuse', 'battery', 'battery_1cell', 'battery_multi', 'power_terminal', 'capacitor'].includes(compType)) finalVal = Math.round(finalVal);
      if (compType === 'voltage_divider') {
          if (CircuitStore.currentEditingComponent.subType === 'r1') compData.r1Value = finalVal;
          else compData.r2Value = finalVal;
      } else { compData.customValue = finalVal; }
      if ((compData.type === 'fuse' || compData.type === 'led') && compData.state === 'blown') {
        compData.state = '0'; if (comp) comp.dataset.state = '0'; 
      }
    }

    if (comp && compData) {
      const cd = document.getElementById(`content-${compId}`);
      if (cd) ComponentDefs.updateContent(compData.type, compId, compData, cd, comp);
    }
    
    // 🟢 3. REKAM DATA BARU & MASUKKAN KE MESIN COMMAND PATTERN
    if (typeof HistoryManager !== 'undefined' && !CircuitStore.isUndoRedoOp) {
        const newData = JSON.parse(JSON.stringify({ ...compData, element: undefined }));
        HistoryManager.pushCommand('CHANGE_PARAM', { compId, oldData, newData }, `Ubah ${compType}`);
    }
    
    this.closeValueModal();
    this.showToast('Parameter berhasil disimpan');
    if (CircuitStore.isSimulationActive) SimulationEngine.run();
  },

  closeValueModal() { 
    const modal = document.getElementById('valueModal');
    if (modal) modal.classList.remove('show'); 
    CircuitStore.currentEditingComponent = null; 
  },

  showTruthTable() {
    const allSwitches = CircuitStore.components.filter(c => c.type === 'switch' || c.type === 'switch_spst');
    const allOutputs  = CircuitStore.components.filter(c => c.type === 'led' || c.type === 'motor_dc' || c.type === 'solenoid' || c.type === 'logic_probe');
    
    if (!allSwitches.length) return this.showToast('Tambahkan minimal satu Switch Digital!');
    if (!allOutputs.length)  return this.showToast('Tambahkan minimal satu Komponen Output!');

    // 1. BANGUN PEMETAAN KONEKSI (Graph Adjacency List)
    let adj = {};
    CircuitStore.components.forEach(c => adj[c.id] = []);
    
    CircuitStore.connections.forEach(conn => {
        const srcComp = CircuitStore.components.find(c => c.id === conn.source.compId);
        const tgtComp = CircuitStore.components.find(c => c.id === conn.target.compId);
        
        // PENTING: Jangan jadikan Ground atau Sumber Daya sebagai jembatan penghubung antar sirkuit
        const ignoreTypes = ['ground', 'power_terminal', 'battery', 'battery_1cell', 'battery_multi', 'vsine'];
        if (srcComp && tgtComp && !ignoreTypes.includes(srcComp.type) && !ignoreTypes.includes(tgtComp.type)) {
            adj[conn.source.compId].push(conn.target.compId);
            adj[conn.target.compId].push(conn.source.compId);
        }
    });

    // 2. KELOMPOKKAN RANGKAIAN YANG TERPISAH (Clustering)
    let visited = new Set();
    let clusters = [];

    CircuitStore.components.forEach(c => {
        if (!visited.has(c.id)) {
            let cluster = new Set();
            let q = [c.id];
            visited.add(c.id);
            
            while(q.length > 0) {
                let curr = q.shift();
                cluster.add(curr);
                adj[curr].forEach(neighbor => {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        q.push(neighbor);
                    }
                });
            }
            clusters.push(cluster);
        }
    });

    // 3. PERSIAPKAN TAMPILAN UI
    const wasActive = CircuitStore.isSimulationActive;
    if (!wasActive) CircuitStore.isSimulationActive = true;

    const tableContainer = document.querySelector('#truthModal .modal-content > div[style*="overflow-x: auto"]');
    if (!tableContainer) return;
    tableContainer.innerHTML = ''; // Kosongkan tabel lama

    // Wrapper Flexbox untuk menjajarkan tabel secara responsif
    const flexWrapper = document.createElement('div');
    flexWrapper.style.display = 'flex';
    flexWrapper.style.flexWrap = 'wrap';
    flexWrapper.style.gap = '20px';
    flexWrapper.style.justifyContent = 'space-around';
    flexWrapper.style.alignItems = 'flex-start';
    tableContainer.appendChild(flexWrapper);

    const origStates = allSwitches.map(s => ({ id: s.id, state: s.state, val: s.element.dataset.state }));
    let validClusterCount = 0;

    // 4. BUAT TABEL UNTUK MASING-MASING RANGKAIAN (CLUSTER)
    clusters.forEach((cluster) => {
        const clusterSwitches = allSwitches.filter(s => cluster.has(s.id));
        const clusterOutputs = allOutputs.filter(o => cluster.has(o.id));

        // Hanya buat tabel jika di kelompok ini ada Input (Switch) DAN ada Output (LED)
        if (clusterSwitches.length > 0 && clusterOutputs.length > 0) {
            validClusterCount++;

            // Cari nama gerbang logika di kelompok ini untuk dijadikan Judul Tabel
            const logicGates = ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'];
            const gatesInCluster = CircuitStore.components.filter(c => cluster.has(c.id) && logicGates.includes(c.type));
            
            let tableName = `Rangkaian ${validClusterCount}`;
            if (gatesInCluster.length === 1) {
                tableName = `Gerbang ${gatesInCluster[0].type.toUpperCase()}`; // Munculkan "Gerbang AND", dll.
            } else if (gatesInCluster.length > 1) {
                tableName = `Kombinasi Logika`;
            }

            const tableWrapper = document.createElement('div');
            tableWrapper.style.flex = '1 1 min-content';
            tableWrapper.style.minWidth = '150px';

            const title = document.createElement('h3');
            title.style.fontSize = '14px';
            title.style.marginBottom = '8px';
            title.style.color = 'var(--primary)';
            title.style.textAlign = 'center';
            title.innerText = tableName;
            tableWrapper.appendChild(title);

            const table = document.createElement('table');
            table.className = 'truth-table';
            table.style.marginTop = '0';
            
            // Header Tabel (Gunakan penamaan input A, B, C... untuk kesan edukatif)
            const inputLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
            let thead = '<thead><tr>';
            clusterSwitches.forEach((s, i) => thead += `<th>${inputLabels[i] || 'In'+(i+1)}</th>`);
            clusterOutputs.forEach((o, i) => thead += `<th>${o.type === 'led' ? 'LED' : (o.type === 'logic_probe' ? 'PROBE' : 'OUT')}</th>`);
            thead += '</tr></thead>';
            table.innerHTML = thead;

            const tbody = document.createElement('tbody');
            let rows = '';

            const numSwitches = clusterSwitches.length;
            if (numSwitches > 8) {
                rows = '<tr><td colspan="100%">Maks 8 Input!</td></tr>';
            } else {
                // Iterasi hanya untuk switch di sirkuit (cluster) ini saja
                for (let i = 0; i < Math.pow(2, numSwitches); i++) {
                    const bin = i.toString(2).padStart(numSwitches, '0');
                    
                    clusterSwitches.forEach((s, j) => { 
                        s.element.dataset.state = bin[j]; 
                        s.state = bin[j]; 
                    });
                    
                    SimulationEngine.run();

                    rows += '<tr>';
                    for (const b of bin) rows += `<td><strong>${b}</strong></td>`;
                    
                    clusterOutputs.forEach(o => {
                        const s = (o.simV > 1.5 || o.outputState === 1 || o.logicState === '1') ? '1' : '0';
                        rows += `<td style="background:${s==='1'?'var(--danger)':'var(--control-bg)'}; color:${s==='1'?'#fff':'var(--text-main)'}; font-weight:bold;">${s}</td>`;
                    });
                    rows += '</tr>';
                }
            }
            
            tbody.innerHTML = rows;
            table.appendChild(tbody);
            tableWrapper.appendChild(table);
            flexWrapper.appendChild(tableWrapper);
        }
    });

    // 5. KEMBALIKAN STATE AWAL SEMUA SWITCH
    allSwitches.forEach(s => {
        const orig = origStates.find(os => os.id === s.id);
        if (orig) { s.state = orig.state; s.element.dataset.state = orig.val; }
    });

    if (!wasActive) SimulationEngine.stop();
    else SimulationEngine.run();

    if (validClusterCount === 0) {
        flexWrapper.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">Tabel gagal dibuat. Pastikan kabel Input dan Output sudah terhubung ke gerbang logika.</p>';
    }

    const truthModal = document.getElementById('truthModal');
    if (truthModal) truthModal.classList.add('show');
  },

  closeTruthTable() { 
    const truthModal = document.getElementById('truthModal');
    if (truthModal) truthModal.classList.remove('show'); 
  }
};