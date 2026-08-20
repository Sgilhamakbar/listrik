// File: src/components/ComponentDefs.js

// =========================================================
// 1. REGISTRI & KELAS DASAR (KERANGKA UI)
// =========================================================
const UIRegistry = {};

class BaseUIComponent {
    constructor(id, compData, contentDiv, mainDiv) {
        this.id = id;
        this.compData = compData;
        this.contentDiv = contentDiv;
        this.mainDiv = mainDiv;
    }

    // 🟢 DEPENDENCY INJECTION: Kelas induk mengambil alih tugas pembacaan global
    get isSimActive() {
        return typeof CircuitStore !== 'undefined' ? CircuitStore.isSimulationActive : false;
    }
    
    get isSimPaused() {
        return typeof CircuitStore !== 'undefined' ? CircuitStore.isPaused : false;
    }

    get actualCompData() {
        // Mengambil data paling mutakhir dari mesin, atau gunakan data lokal jika tidak ada
        if (typeof CircuitStore !== 'undefined') {
            return CircuitStore.components.find(c => c.id === this.id) || this.compData;
        }
        return this.compData;
    }

    static getDimensions() { return [80, 60]; }
    getSVG() { return `<div style="padding:10px;border:1px solid #000;color:red;background:#fee2e2;">?</div>`; }
    bindSpecificEvents() {}
    
    setPinActive(pinClass, isActive) {
        if (!this.contentDiv) return;
        const el = this.contentDiv.querySelector('.' + pinClass);
        if (el) el.classList.toggle('leg-active', isActive);
    }

    updateState(isSimActive) {
        if (this.compData.inputStates) {
            const isHigh = val => val > 2.5;
            if (this.compData.inputs > 0) this.setPinActive('pin-in-0', isHigh(this.compData.inputStates[0]));
            if (this.compData.inputs > 1) this.setPinActive('pin-in-1', isHigh(this.compData.inputStates[1]));
        }
    }
}

// =========================================================
// 2. OBJEK PENGENDALI (MENGGANTIKAN SWITCH-CASE RAKSASA)
// =========================================================
const ComponentDefs = {
    getDimensions(type) {
        const UIClass = UIRegistry[type] || BaseUIComponent;
        return UIClass.getDimensions();
    },

    updateContent(type, id, compData, contentDiv, div) {
        if (!contentDiv.uiInstance) {
            const UIClass = UIRegistry[type] || BaseUIComponent;
            contentDiv.uiInstance = new UIClass(id, compData, contentDiv, div);
            
            // Render SVG
            contentDiv.innerHTML = contentDiv.uiInstance.getSVG();
            
            // Pasang Event Delegation Global
            this.bindGlobalEvents(type, id, contentDiv, div);
            
            // Pasang Event Spesifik (jika komponennya butuh)
            contentDiv.uiInstance.bindSpecificEvents();
        }
        
        // Render state visual
        contentDiv.uiInstance.compData = compData;
        const isSimActive = typeof CircuitStore !== 'undefined' ? CircuitStore.isSimulationActive : false;
        contentDiv.uiInstance.updateState(isSimActive);
    },

    updateDOMState(type, compData, contentDiv, id) {
        if (contentDiv.uiInstance) {
            contentDiv.uiInstance.compData = compData;
            const isSimActive = typeof CircuitStore !== 'undefined' ? CircuitStore.isSimulationActive : false;
            contentDiv.uiInstance.updateState(isSimActive);
        }
    },

    bindGlobalEvents(type, id, contentDiv, div) {
        contentDiv.addEventListener('click', (e) => {
            if (e.target.closest('.val-trigger')) {
                e.stopPropagation(); window.openValueModal(id, type, e.target.closest('.val-trigger').dataset.sub);
            }
            if (e.target.closest('.btn-up')) { e.stopPropagation(); window.adjustSensorValue(id, 5); }
            if (e.target.closest('.btn-down')) { e.stopPropagation(); window.adjustSensorValue(id, -5); }
            if (e.target.closest('.speed-btn-up')) { e.stopPropagation(); window.adjustFlasherSpeed(id, -100); }
            if (e.target.closest('.speed-btn-down')) { e.stopPropagation(); window.adjustFlasherSpeed(id, 100); }
            if (e.target.closest('.lock-down-btn')) { e.stopPropagation(); window.togglePushButtonLock(id, true); }
            if (e.target.closest('.lock-up-btn')) { e.stopPropagation(); window.togglePushButtonLock(id, false); }
            if (e.target.closest('.range-btn')) {
                e.stopPropagation();
                const currentComp = typeof CircuitStore !== 'undefined' ? CircuitStore.components.find(c => c.id === id) : null;
                if (currentComp) {
                    currentComp.isMilli = !currentComp.isMilli;
                    if (contentDiv.uiInstance) contentDiv.uiInstance.updateState(CircuitStore.isSimulationActive);
                }
            }
        });

        // Setel kursor khusus
        if(div) div.style.cursor = ['switch', 'push_button', 'push_button_nc', 'switch_spst', 'potentiometer', 'ldr', 'thermistor_ntc', 'thermistor_ptc'].includes(type) ? 'pointer' : 'default';
    }
};

// =========================================================
// 3. IMPLEMENTASI KELAS KOMPONEN (BAGIAN 1: KABEL & TERMINAL)
// =========================================================

// --- KABEL LURUS (1 TO 1) ---
class Wire1To1 extends BaseUIComponent {
    static getDimensions() { return [60, 40]; }
    getSVG() {
        return `<svg width="60" height="40" viewBox="0 0 60 40">
          <line class="pin-in-0" x1="0" y1="20" x2="60" y2="20" stroke="#006600" stroke-width="4"/>
        </svg>`;
    }
    updateState(isSimActive) {
        this.setPinActive('pin-in-0', this.compData.simV > 0);
    }
}
UIRegistry['wire_1to1'] = Wire1To1;

// --- KABEL CABANG (1 TO 2) ---
class Wire1To2 extends BaseUIComponent {
    static getDimensions() { return [60, 60]; }
    getSVG() {
        return `<svg width="60" height="60" viewBox="0 0 60 60">
          <line class="pin-in-0" x1="0" y1="30" x2="30" y2="30" stroke="#006600" stroke-width="4"/>
          <line class="pin-out-0" x1="30" y1="15" x2="30" y2="45" stroke="#006600" stroke-width="4"/>
          <line class="pin-out-1" x1="30" y1="15" x2="60" y2="15" stroke="#006600" stroke-width="4"/>
          <line class="pin-out-2" x1="30" y1="45" x2="60" y2="45" stroke="#006600" stroke-width="4"/>
          <circle cx="30" cy="30" r="4" fill="#000000"/>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', vState); 
        this.setPinActive('pin-out-1', vState); 
        this.setPinActive('pin-out-2', vState);
    }
}
UIRegistry['wire_1to2'] = Wire1To2;

// --- JUNCTION (NODE CABANG) ---
class Junction extends BaseUIComponent {
    static getDimensions() { return [60, 60]; }
    getSVG() {
        return `<svg width="60" height="60" viewBox="0 0 60 60">
          <line class="pin-in-0" x1="0" y1="30" x2="30" y2="30" stroke="#006600" stroke-width="4"/>
          <line class="pin-out-0" x1="30" y1="30" x2="60" y2="10" stroke="#006600" stroke-width="4"/>
          <line class="pin-out-1" x1="30" y1="30" x2="60" y2="30" stroke="#006600" stroke-width="4"/>
          <line class="pin-out-2" x1="30" y1="30" x2="60" y2="50" stroke="#006600" stroke-width="4"/>
          <circle cx="30" cy="30" r="4" fill="#000000"/>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', vState); 
        this.setPinActive('pin-out-1', vState); 
        this.setPinActive('pin-out-2', vState);
    }
}
UIRegistry['junction'] = Junction;

// --- TITIK SOLDER (WIRE NODE) ---
class WireNode extends BaseUIComponent {
    static getDimensions() { return [20, 20]; }
    getSVG() {
        return `<svg width="20" height="20" viewBox="0 0 20 20" style="display:block; position:absolute; top:0; left:0;">
          <circle class="anim-body" cx="10" cy="10" r="6" fill="#1e293b" stroke="#334155" stroke-width="2"/>
        </svg>`;
    }
    updateState(isSimActive) {
        const dot = this.contentDiv.querySelector('.anim-body');
        if (dot) dot.setAttribute('fill', this.compData.simV > 0 ? '#22c55e' : '#1e293b');
    }
}
UIRegistry['wire_node'] = WireNode;

// --- TERMINAL GROUND ---
class GroundUI extends BaseUIComponent {
    static getDimensions() { return [40, 40]; }
    getSVG() {
        return `<svg width="40" height="40" viewBox="0 0 40 40">
            <line class="pin-in-0" x1="20" y1="0" x2="20" y2="20" stroke="#000000" stroke-width="3"/>
            <line x1="8" y1="20" x2="32" y2="20" stroke="#000000" stroke-width="3"/>
            <line x1="14" y1="26" x2="26" y2="26" stroke="#000000" stroke-width="3"/>
            <line x1="18" y1="32" x2="22" y2="32" stroke="#000000" stroke-width="3"/>
        </svg>`;
    }
}
UIRegistry['ground'] = GroundUI;

// =========================================================
// 3. IMPLEMENTASI KELAS KOMPONEN (BAGIAN 2: DAYA & PASIF)
// =========================================================

// -----------------------------------------------------
// KELOMPOK SUMBER DAYA & AC
// -----------------------------------------------------
class PowerTerminalUI extends BaseUIComponent {
    static getDimensions() { return [60, 40]; }
    getSVG() {
        return `<svg width="60" height="40" viewBox="0 0 60 40"><line class="pin-out-0" x1="30" y1="40" x2="30" y2="20" stroke="#006600" stroke-width="3"/><path d="M 30 20 L 20 30 M 30 20 L 40 30 M 15 20 L 45 20" fill="none" stroke="#1e293b" stroke-width="3"/><text class="anim-text comp-label resistor-val val-trigger" x="30" y="12" text-anchor="middle" fill="#4f46e5" style="cursor:pointer;pointer-events:auto;">12V</text></svg>`;
    }
    updateState(isSimActive) {
        this.setPinActive('pin-out-0', this.compData.simV > 0 || isSimActive); 
        const txtValB = this.contentDiv.querySelector('.anim-text');
        if (txtValB) txtValB.textContent = (this.compData.customValue != null ? this.compData.customValue : 12) + 'V';
    }
}
UIRegistry['power_terminal'] = PowerTerminalUI;

class BatteryUI extends BaseUIComponent {
    static getDimensions() { return [80, 60]; }
    getSVG() {
        if (this.compData.type === 'battery_1cell') {
            return `<svg width="80" height="60" viewBox="0 0 80 60"><line class="pin-out-0" x1="0" y1="30" x2="35" y2="30" stroke="#006600" stroke-width="3"/><line class="pin-out-1" x1="80" y1="30" x2="45" y2="30" stroke="#006600" stroke-width="3"/><line x1="35" y1="10" x2="35" y2="50" stroke="#1e293b" stroke-width="3"/><line x1="45" y1="18" x2="45" y2="42" stroke="#1e293b" stroke-width="5"/><text x="25" y="20" class="comp-label" fill="red" font-weight="bold" font-size="14">+</text><text x="55" y="20" class="comp-label" fill="black" font-weight="bold" font-size="14">-</text><text x="45" y="60" class="anim-text comp-label resistor-val val-trigger" text-anchor="middle" fill="#4f46e5" style="cursor:pointer;pointer-events:auto;">1.5V</text></svg>`;
        } else if (this.compData.type === 'battery_multi') {
            return `<svg width="80" height="60" viewBox="0 0 80 60"><line class="pin-out-0" x1="0" y1="30" x2="25" y2="30" stroke="#006600" stroke-width="3"/><line class="pin-out-1" x1="80" y1="30" x2="55" y2="30" stroke="#006600" stroke-width="3"/><line x1="25" y1="12" x2="25" y2="48" stroke="#1e293b" stroke-width="3"/><line x1="33" y1="20" x2="33" y2="40" stroke="#1e293b" stroke-width="4"/><line x1="36" y1="30" x2="44" y2="30" stroke="#1e293b" stroke-width="2" stroke-dasharray="2 2"/><line x1="47" y1="12" x2="47" y2="48" stroke="#1e293b" stroke-width="3"/><line x1="55" y1="20" x2="55" y2="40" stroke="#1e293b" stroke-width="4"/><text x="15" y="20" class="comp-label" fill="red" font-weight="bold" font-size="14">+</text><text x="65" y="20" class="comp-label" fill="black" font-weight="bold" font-size="14">-</text><text x="40" y="60" class="anim-text comp-label resistor-val val-trigger" text-anchor="middle" fill="#4f46e5" style="cursor:pointer;pointer-events:auto;">12V</text></svg>`;
        }
        return `<svg width="80" height="60" viewBox="0 0 80 60"><rect x="25" y="15" width="30" height="30" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/><line class="pin-out-0" x1="80" y1="20" x2="55" y2="20" stroke="#006600" stroke-width="3"/><line class="pin-out-1" x1="80" y1="40" x2="55" y2="40" stroke="#006600" stroke-width="3"/><line x1="40" y1="20" x2="40" y2="40" stroke="#1e293b" stroke-width="3"/><line x1="35" y1="25" x2="35" y2="35" stroke="#1e293b" stroke-width="4"/><text x="40" y="12" class="anim-text comp-label resistor-val val-trigger" text-anchor="middle" fill="#4f46e5" style="cursor:pointer;pointer-events:auto;">12V</text><text x="65" y="18" class="comp-label" fill="red">+</text><text x="65" y="38" class="comp-label" fill="black">-</text></svg>`;
    }
    updateState(isSimActive) {
        this.setPinActive('pin-out-0', this.compData.simV > 0 || isSimActive); 
        this.setPinActive('pin-out-1', false); 
        const txtValB = this.contentDiv.querySelector('.anim-text');
        if (txtValB) {
           let v = this.compData.customValue;
           if (v == null) v = this.compData.type === 'battery_1cell' ? 1.5 : 12;
           txtValB.textContent = v + 'V';
        }
    }
}
UIRegistry['battery'] = BatteryUI;
UIRegistry['battery_1cell'] = BatteryUI;
UIRegistry['battery_multi'] = BatteryUI;

class VSineUI extends BaseUIComponent {
    static getDimensions() { return [130, 90]; }
    getSVG() {
        return `<svg width="130" height="90" viewBox="0 0 130 90">
          <line class="pin-out-0" x1="0"   y1="35" x2="41"  y2="35" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-1" x1="89"  y1="35" x2="130" y2="35" stroke="#006600" stroke-width="3"/>
          <circle class="anim-body" cx="65" cy="35" r="24" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <path d="M 53 35 Q 59 23 65 35 T 77 35" fill="none" stroke="#1e293b" stroke-width="2"/>
          <text class="anim-text amp-val val-trigger" x="35" y="75" text-anchor="middle" font-size="11" fill="#4f46e5" font-weight="bold" style="cursor:pointer; pointer-events:auto;" title="Klik untuk atur V-Sine"></text>          
          <text class="anim-text freq-val val-trigger" x="95" y="75" text-anchor="middle" font-size="11" fill="#4f46e5" font-weight="bold" style="cursor:pointer; pointer-events:auto;" title="Klik untuk atur V-Sine"></text>
        </svg>`;
    }
    updateState(isSimActive) {
        this.setPinActive('pin-out-0', this.compData.simV > 0.5);
        const ampTxt = this.contentDiv.querySelector('.amp-val');        
        if (ampTxt) ampTxt.textContent = `${this.compData.customValue !== undefined ? this.compData.customValue : 12}Vp`;
        const freqTxt = this.contentDiv.querySelector('.freq-val');
        if (freqTxt) freqTxt.textContent = `${this.compData.freqValue !== undefined ? this.compData.freqValue : 1}Hz`;
    }
}
UIRegistry['vsine'] = VSineUI;

class OutputTerminalUI extends BaseUIComponent {
    static getDimensions() { return [75, 40]; }
    getSVG() {
        return `<svg width="75" height="40" viewBox="0 0 75 40">
          <line class="pin-in-0" x1="0" y1="20" x2="20" y2="20" stroke="#006600" stroke-width="3"/>
          <rect x="20" y="5" width="50" height="30" rx="4" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <text class="anim-text meter-val" x="45" y="24" text-anchor="middle" font-size="12">0.0V</text>
          <text x="45" y="48" class="comp-label" text-anchor="middle" font-size="8">OUT</text>
        </svg>`;
    }
    updateState(isSimActive) {
        this.setPinActive('pin-in-0', this.compData.simV > 0);
        const text = this.contentDiv.querySelector('.anim-text');
        if (text) text.textContent = (this.compData.simV || 0).toFixed(1) + 'V';
    }
}
UIRegistry['output_terminal'] = OutputTerminalUI;

// -----------------------------------------------------
// KELOMPOK ALAT UKUR (METER) & PROBE
// -----------------------------------------------------
class VoltmeterUI extends BaseUIComponent {
    static getDimensions() { return [80, 80]; }
    getSVG() {
        return `<svg width="80" height="80" viewBox="0 0 80 80">
          <line class="pin-in-0" x1="0" y1="40" x2="16" y2="40" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-1" x1="64" y1="40" x2="80" y2="40" stroke="#006600" stroke-width="3"/>
          <circle cx="40" cy="40" r="24" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <text class="anim-text meter-val" x="40" y="41" text-anchor="middle" font-size="15">0.0V</text>
          <rect class="control-btn range-btn" x="30" y="47" width="20" height="11" rx="2" fill="#475569" style="cursor:pointer; pointer-events:auto;"/>
          <text class="range-txt" x="40" y="55" font-size="7" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">V</text>
          <text x="0" y="30" class="comp-label" fill="red" font-size="14" font-weight="bold">+</text>
          <text x="70" y="30" class="comp-label" fill="black" font-size="14" font-weight="bold">-</text>
        </svg>`;
    }
    updateState(isSimActive) {
        this.setPinActive('pin-in-0', false); this.setPinActive('pin-in-1', false);
        let displayVolt = this.compData.displayVolt !== undefined ? this.compData.displayVolt : (this.compData.simV || 0);
        const text = this.contentDiv.querySelector('.anim-text');
        const rangeTxt = this.contentDiv.querySelector('.range-txt');
        
        if (this.compData.isMilli) {
            if (text) text.textContent = (displayVolt * 1000).toFixed(0) + 'mV';
            if (rangeTxt) { rangeTxt.textContent = 'mV'; rangeTxt.setAttribute('fill', '#eab308'); }
        } else {
            if (text) text.textContent = displayVolt.toFixed(1) + 'V';
            if (rangeTxt) { rangeTxt.textContent = 'V'; rangeTxt.setAttribute('fill', '#ffffff'); }
        }
    }
}
UIRegistry['voltmeter'] = VoltmeterUI;

class VoltmeterACUI extends BaseUIComponent {
    static getDimensions() { return [80, 80]; }
    
    getSVG() {
        return `<svg width="80" height="80" viewBox="0 0 80 80">
          <!-- Pin Konektor -->
          <line class="pin-in-0" x1="0" y1="40" x2="16" y2="40" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-1" x1="64" y1="40" x2="80" y2="40" stroke="#006600" stroke-width="3"/>
          
          <!-- Bodi Lingkaran Meteran -->
          <circle cx="40" cy="40" r="24" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          
          <!-- Teks Nilai Tegangan -->
          <text class="anim-text meter-val" x="40" y="39" text-anchor="middle" font-size="14">0.0V</text>
          
          <!-- Tombol Switch Skala (Volt / milivolt) -->
          <rect class="control-btn range-btn" x="30" y="47" width="20" height="11" rx="2" fill="#475569" style="cursor:pointer; pointer-events:auto;"/>
          <text class="range-txt" x="40" y="55" font-size="7" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">VAC</text>
          
          <!-- Simbol Fasa AC (Tilde) sebagai ganti Plus/Minus -->
          <text x="6" y="30" class="comp-label" fill="#1e293b" font-size="14" font-weight="bold">~</text>
          <text x="74" y="30" class="comp-label" fill="#1e293b" font-size="14" font-weight="bold">~</text>
        </svg>`;
    }
    
    updateState(isSimActive) {
        // Pin Voltmeter tidak menyala hijau karena fungsinya hanya membaca, bukan menyalurkan arus
        this.setPinActive('pin-in-0', false); 
        this.setPinActive('pin-in-1', false);
        
        // Kita akan menggunakan variabel simV_rms dari mesin fisika nanti
        let displayVolt = this.compData.simV_rms || 0;
        
        const text = this.contentDiv.querySelector('.anim-text');
        const rangeTxt = this.contentDiv.querySelector('.range-txt');
        
        // Fitur klik untuk mengubah skala ke miliVolt (mV) juga dipertahankan!
        if (this.compData.isMilli) {
            if (text) text.textContent = (displayVolt * 1000).toFixed(0) + 'mV';
            if (rangeTxt) { 
                rangeTxt.textContent = 'mV~'; 
                rangeTxt.setAttribute('fill', '#eab308'); // Warna kuning saat mode mV
            }
        } else {
            if (text) text.textContent = displayVolt.toFixed(1) + 'V';
            if (rangeTxt) { 
                rangeTxt.textContent = 'VAC'; 
                rangeTxt.setAttribute('fill', '#ffffff'); // Warna putih saat mode V biasa
            }
        }
    }
}
// Mendaftarkan komponen ke UI Registry
UIRegistry['voltmeter_ac'] = VoltmeterACUI;

class AmmeterUI extends BaseUIComponent {
    static getDimensions() { return [80, 80]; }
    getSVG() {
        return `<svg width="80" height="80" viewBox="0 0 80 80">
          <line class="pin-in-0" x1="0" y1="40" x2="16" y2="40" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="64" y1="40" x2="80" y2="40" stroke="#006600" stroke-width="3"/>
          <circle cx="40" cy="40" r="24" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <text class="anim-text meter-val" x="40" y="41" text-anchor="middle" font-size="15">0.00A</text>
          <rect class="control-btn range-btn" x="30" y="47" width="20" height="11" rx="2" fill="#475569" style="cursor:pointer; pointer-events:auto;"/>
          <text class="range-txt" x="40" y="55" font-size="7" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">A</text>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); this.setPinActive('pin-out-0', vState);
        let iVal = Math.abs(this.compData.simI || 0);
        
        const text = this.contentDiv.querySelector('.anim-text');
        const rangeTxt = this.contentDiv.querySelector('.range-txt');
        
        if (this.compData.isMilli) {
            if (text) text.textContent = (iVal * 1000).toFixed(0) + 'mA';
            if (rangeTxt) { rangeTxt.textContent = 'mA'; rangeTxt.setAttribute('fill', '#eab308'); }
        } else {
            if (text) text.textContent = iVal.toFixed(2) + 'A';
            if (rangeTxt) { rangeTxt.textContent = 'A'; rangeTxt.setAttribute('fill', '#ffffff'); }
        }
    }
}
UIRegistry['ammeter'] = AmmeterUI;

class OhmmeterUI extends BaseUIComponent {
    static getDimensions() { return [80, 80]; }
    getSVG() {
        return `<svg width="80" height="80" viewBox="0 0 80 80">
          <line class="pin-in-0" x1="0" y1="40" x2="16" y2="40" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-1" x1="64" y1="40" x2="80" y2="40" stroke="#006600" stroke-width="3"/>
          <circle cx="40" cy="40" r="24" fill="#1e293b" stroke="#1e293b" stroke-width="2"/>
          <text class="anim-text meter-val" x="40" y="41" text-anchor="middle" font-size="14" font-family="monospace" font-weight="bold" fill="#facc15">OL</text>
          <text class="range-txt" x="40" y="55" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">Ω</text>
          <text x="1" y="30" class="comp-label" fill="red" font-size="14" font-weight="bold">+</text>
          <text x="70" y="30" class="comp-label" fill="black" font-size="14" font-weight="bold">-</text>
        </svg>`;
    }
    updateState(isSimActive) {
        this.setPinActive('pin-in-0', false); this.setPinActive('pin-in-1', false);
        const text = this.contentDiv.querySelector('.anim-text');
        const rangeTxt = this.contentDiv.querySelector('.range-txt');

        if (text) {
            if (this.compData.isError) {
                text.textContent = 'ERR'; text.setAttribute('fill', '#ef4444');
                if (rangeTxt) rangeTxt.textContent = 'LIVE!';
            } else if (this.compData.isOL) {
                text.textContent = 'OL'; text.setAttribute('fill', '#facc15');
                if (rangeTxt) rangeTxt.textContent = 'Ω';
            } else {
                let r = this.compData.simR || 0;
                text.setAttribute('fill', '#4ade80');
                if (rangeTxt) rangeTxt.textContent = 'Ω';

                if (r >= 1000000) text.textContent = (r / 1000000).toFixed(1) + 'M';
                else if (r >= 1000) text.textContent = (r / 1000).toFixed(1) + 'k';
                else text.textContent = r.toFixed(1);
            }
        }
    }
}
UIRegistry['ohmmeter'] = OhmmeterUI;

class LogicProbeUI extends BaseUIComponent {
    static getDimensions() { return [60, 40]; }
    getSVG() {
        return `<svg width="60" height="40" viewBox="0 0 60 40">
          <line class="pin-in-0" x1="0" y1="20" x2="15" y2="20" stroke="#006600" stroke-width="3"/>
          <polygon points="15,15 25,20 15,25" fill="#1e293b"/>
          <rect class="anim-body" x="25" y="5" width="30" height="30" rx="4" fill="#1e293b" stroke="#1e293b" stroke-width="2"/>
          <text class="anim-text" x="40" y="26" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="20" fill="#94a3b8">Z</text>
        </svg>`;
    }
    updateState(isSimActive) {
        this.setPinActive('pin-in-0', this.compData.simV > 0);
        const body = this.contentDiv.querySelector('.anim-body');
        const text = this.contentDiv.querySelector('.anim-text');
        const state = this.compData.logicState || 'Z'; 
        
        if (text) {
            text.textContent = state;
            if (state === '1') text.setAttribute('fill', '#4ade80');
            else if (state === '0') text.setAttribute('fill', '#f87171');
            else if (state === 'E') text.setAttribute('fill', '#fbbf24');
            else text.setAttribute('fill', '#94a3b8');
        }
        if (body) {
            if (state === '1') body.setAttribute('stroke', '#4ade80');
            else if (state === '0') body.setAttribute('stroke', '#f87171');
            else body.setAttribute('stroke', '#475569');
        }
    }
}
UIRegistry['logic_probe'] = LogicProbeUI;

// -----------------------------------------------------
// KELOMPOK KOMPONEN PASIF (Resistor, Kapasitor, Fuse, Voltage Divider)
// -----------------------------------------------------
class ResistorUI extends BaseUIComponent {
    static getDimensions() { return [80, 50]; }
    getSVG() {
        return `<svg width="80" height="50" viewBox="0 0 80 50">
            <line class="pin-in-0" x1="0" y1="20" x2="20" y2="20" stroke="#006600" stroke-width="3"/>
            <line class="pin-out-0" x1="60" y1="20" x2="80" y2="20" stroke="#006600" stroke-width="3"/>
            <path d="M 20 20 l 5 -10 l 10 20 l 10 -20 l 10 20 l 5 -10" fill="none" stroke="#1e293b" stroke-width="2" stroke-linejoin="round"/>
            <text class="anim-text comp-label resistor-val val-trigger" x="40" y="42" text-anchor="middle" fill="#4f46e5" style="cursor:pointer;pointer-events:auto;"></text>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', vState);
        
        const txtVal = this.contentDiv.querySelector('.anim-text');
        if (txtVal) {
            const rv = this.compData.customValue ?? 330; 
            txtVal.textContent = rv >= 1000000 ? `${(rv/1e6).toFixed(1)}M` : rv >= 1000 ? `${(rv/1000).toFixed(1)}k` : `${rv}Ω`;
        }
    }
}
UIRegistry['resistor'] = ResistorUI;

class CapacitorUI extends BaseUIComponent {
    static getDimensions() { return [80, 50]; }
    getSVG() {
        return `<svg width="80" height="50" viewBox="0 0 80 50">
            <line class="pin-in-0" x1="0" y1="20" x2="35" y2="20" stroke="#006600" stroke-width="3"/>
            <line class="pin-out-0" x1="80" y1="20" x2="45" y2="20" stroke="#006600" stroke-width="3"/>
            <line x1="35" y1="10" x2="35" y2="35" stroke="#1e293b" stroke-width="3"/>
            <line x1="45" y1="10" x2="45" y2="35" stroke="#1e293b" stroke-width="3"/>
            <text x="40" y="8" class="comp-label" text-anchor="middle">C${this.id}</text>
            <text class="anim-text comp-label resistor-val val-trigger" x="40" y="48" text-anchor="middle" fill="#4f46e5" style="cursor:pointer;pointer-events:auto;"></text>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', vState);
        
        const txtVal = this.contentDiv.querySelector('.anim-text');
        if (txtVal) {
            const cv = this.compData.customValue ?? 10; 
            txtVal.textContent = cv >= 1000 ? `${(cv/1000).toFixed(1)}mF` : `${cv}µF`;
        }
    }
}
UIRegistry['capacitor'] = CapacitorUI;

class FuseUI extends BaseUIComponent {
    static getDimensions() { return [80, 40]; }
    getSVG() {
        return `<svg width="80" height="40" viewBox="0 0 80 40">
            <line class="pin-in-0" x1="0" y1="20" x2="25" y2="20" stroke="#006600" stroke-width="3"/>
            <line class="pin-out-0" x1="55" y1="20" x2="80" y2="20" stroke="#006600" stroke-width="3"/>
            <rect class="anim-body" x="25" y="10" width="30" height="20" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
            <path class="anim-line" d="M 25 20 Q 40 5 55 20" fill="none" stroke="#1e293b" stroke-width="3"/>
            <text class="anim-text comp-label fuse-val val-trigger" x="40" y="8" text-anchor="middle" fill="#4f46e5" style="cursor:pointer;pointer-events:auto;"></text>
            <text class="anim-blown comp-label" x="40" y="24" fill="red" font-weight="bold" text-anchor="middle" style="display:none;">BLOWN</text>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        const isBlown = this.compData.state === 'blown'; 
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', !isBlown && vState);
        
        const body = this.contentDiv.querySelector('.anim-body'); 
        const line = this.contentDiv.querySelector('.anim-line');
        const txtBlown = this.contentDiv.querySelector('.anim-blown'); 
        const txtVal = this.contentDiv.querySelector('.anim-text');
        
        if (body) body.setAttribute('fill', isBlown ? '#fee2e2' : '#e8e6d3');
        if (line) line.style.display = isBlown ? 'none' : 'block';
        if (txtBlown) txtBlown.style.display = isBlown ? 'block' : 'none';
        if (txtVal) txtVal.textContent = (this.compData.customValue ?? 10) + 'A';
    }
}
UIRegistry['fuse'] = FuseUI;

class VoltageDividerUI extends BaseUIComponent {
    static getDimensions() { return [80, 70]; }
    getSVG() {
        return `<svg width="80" height="70" viewBox="0 0 80 70">
          <rect x="5" y="5" width="70" height="60" rx="4" fill="var(--bg-container)" stroke="#1e293b" stroke-width="2"/>
          <line class="pin-in-0" x1="0" y1="35" x2="5" y2="35" stroke="#006600" stroke-width="2"/>
          <line class="pin-out-0" x1="75" y1="35" x2="80" y2="35" stroke="#006600" stroke-width="2"/>
          
          <text x="40" y="18" class="anim-text comp-label resistor-val val-trigger r1-label" data-sub="r1" font-size="9" text-anchor="middle" fill="#4f46e5" style="cursor:pointer;pointer-events:auto;">R1: 10kΩ</text>
          <text x="40" y="29" class="v1-label" font-size="9" font-weight="bold" text-anchor="middle" fill="#f87171">V1: 0.00V</text>
          
          <text x="40" y="45" class="anim-text comp-label resistor-val val-trigger r2-label" data-sub="r2" font-size="9" text-anchor="middle" fill="#4f46e5" style="cursor:pointer;pointer-events:auto;">R2: 10kΩ</text>
          <text x="40" y="56" class="v2-label" font-size="9" font-weight="bold" text-anchor="middle" fill="#22c55e">V2: 0.00V</text>
        </svg>`;
    }
    updateState(isSimActive) {
        let v1 = this.compData.v1 || 0; 
        let v2 = this.compData.v2 || 0; 
        
        this.setPinActive('pin-in-0', v1 > 0 || v2 > 0);
        this.setPinActive('pin-out-0', v2 > 0);
        
        const r1Txt = this.contentDiv.querySelector('.r1-label');
        const r2Txt = this.contentDiv.querySelector('.r2-label');
        const v1Txt = this.contentDiv.querySelector('.v1-label');
        const v2Txt = this.contentDiv.querySelector('.v2-label');
        
        let formatR = (val) => val >= 1000000 ? (val/1000000) + 'M' : (val >= 1000 ? (val/1000) + 'k' : val);
        
        if (r1Txt) r1Txt.textContent = `R1: ${formatR(this.compData.r1Value || 10000)}Ω`;
        if (r2Txt) r2Txt.textContent = `R2: ${formatR(this.compData.r2Value || 10000)}Ω`;
        if (v1Txt) v1Txt.textContent = `V1: ${v1.toFixed(2)}V`;
        if (v2Txt) v2Txt.textContent = `V2: ${v2.toFixed(2)}V`;
    }
}
UIRegistry['voltage_divider'] = VoltageDividerUI;

// =========================================================
// 3. IMPLEMENTASI KELAS KOMPONEN (BAGIAN 3.1: SENSOR & FLASHER)
// =========================================================

// -----------------------------------------------------
// KELOMPOK SENSOR (LDR & THERMISTOR)
// -----------------------------------------------------
class LdrUI extends BaseUIComponent {
    static getDimensions() { return [80, 60]; }
    getSVG() {
        return `<svg width="80" height="60" viewBox="0 0 80 60" style="overflow: visible;">
          <line class="pin-in-0" x1="0" y1="25" x2="25" y2="25" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="55" y1="25" x2="80" y2="25" stroke="#006600" stroke-width="3"/>
          <circle cx="40" cy="25" r="16" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <path d="M 28 25 l 4 -8 l 8 16 l 8 -16 l 4 8" fill="none" stroke="#1e293b" stroke-width="2" stroke-linejoin="round"/>
          <path d="M 25 5 L 35 15 M 32 15 L 35 15 L 35 12 M 15 10 L 25 20 M 22 20 L 25 20 L 25 17" fill="none" stroke="#f59e0b" stroke-width="3"/>
          
          <rect class="control-btn btn-down" x="10" y="45" width="20" height="14" rx="3" fill="#ef4444" style="cursor:pointer; pointer-events:auto;"/>
          <polygon points="23,49 17,52 23,55" fill="#fff" pointer-events="none"/>

          <rect class="control-btn btn-up" x="50" y="45" width="20" height="14" rx="3" fill="#22c55e" style="cursor:pointer; pointer-events:auto;"/>
          <polygon points="57,49 63,52 57,55" fill="#fff" pointer-events="none"/>
          
          <text class="anim-text comp-label resistor-val val-trigger" x="60" y="5" text-anchor="middle" font-size="10" font-weight="bold" fill="#4f46e5" style="cursor:pointer; pointer-events:auto;"></text>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', vState);
        const text = this.contentDiv.querySelector('.anim-text');
        if (text) text.textContent = (this.compData.state || '50') + '% Lux';
    }
}
UIRegistry['ldr'] = LdrUI;

class ThermistorUI extends BaseUIComponent {
    static getDimensions() { return [80, 60]; }
    getSVG() {
        const label = this.compData.type === 'thermistor_ntc' ? '-t°' : '+t°';
        return `<svg width="80" height="60" viewBox="0 0 80 60" style="overflow: visible;">
          <line class="pin-in-0" x1="0" y1="25" x2="20" y2="25" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="60" y1="25" x2="80" y2="25" stroke="#006600" stroke-width="3"/>
          <rect x="20" y="17" width="40" height="16" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <path d="M 15 40 L 25 40 L 65 7" fill="none" stroke="#1e293b" stroke-width="3"/>
          <text x="35" y="12" class="comp-label" font-weight="bold">${label}</text>
          
          <rect class="control-btn btn-down" x="15" y="48" width="17" height="14" rx="3" fill="#ef4444" style="cursor:pointer; pointer-events:auto;"/>
          <polygon points="26.5,52 20.5,55 26.5,58" fill="#fff" pointer-events="none"/>

          <rect class="control-btn btn-up" x="45" y="48" width="17" height="14" rx="3" fill="#22c55e" style="cursor:pointer; pointer-events:auto;"/>
          <polygon points="50.5,52 56.5,55 50.5,58" fill="#fff" pointer-events="none"/>
          
          <text class="anim-text comp-label resistor-val val-trigger" x="45" y="45" text-anchor="middle" font-size="11" font-weight="bold" fill="#4f46e5" style="cursor:pointer; pointer-events:auto;"></text>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', vState);
        const text = this.contentDiv.querySelector('.anim-text');
        if (text) text.textContent = (this.compData.state || '50') + '°C';
    }
}
UIRegistry['thermistor_ntc'] = ThermistorUI;
UIRegistry['thermistor_ptc'] = ThermistorUI;

// -----------------------------------------------------
// POTENSIOMETER & FLASHER
// -----------------------------------------------------
class PotentiometerUI extends BaseUIComponent {
    static getDimensions() { return [100, 60]; }
    getSVG() {
        return `<svg width="100" height="60" viewBox="0 0 100 60" style="overflow: visible;">
          <line class="pin-in-0" x1="0" y1="20" x2="20" y2="20" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-1" x1="80" y1="20" x2="100" y2="20" stroke="#006600" stroke-width="3"/>
          <path d="M 20 20 l 7.5 -10 l 15 20 l 15 -20 l 15 20 l 7.5 -10" fill="none" stroke="#1e293b" stroke-width="2" stroke-linejoin="round"/>
          <line class="pin-out-0" x1="50" y1="22" x2="50" y2="60" stroke="#006600" stroke-width="3"/>
          <polygon points="50,22 46,30 54,30" fill="#1e293b"/>
          
          <text x="8" y="32" class="comp-label" font-size="9" font-weight="bold" fill="#0284c7">IN</text>
          <text x="80" y="32" class="comp-label" font-size="9" font-weight="bold" fill="#1e293b">GND</text>
          <text x="30" y="55" class="comp-label" font-size="9" font-weight="bold" fill="#e11d48">OUT</text>
          
          <rect class="control-btn btn-down" x="-2" y="-6" width="26" height="14" rx="3" fill="#ef4444" style="cursor:pointer; pointer-events:auto;"/>
          <polygon points="13,-2 7,1 13,4" fill="#fff" pointer-events="none"/>
          <text class="anim-text" x="50" y="6" text-anchor="middle" font-size="12" font-weight="bold" fill="#4f46e5" pointer-events="none"></text>
          <rect class="control-btn btn-up" x="78" y="-6" width="26" height="14" rx="3" fill="#22c55e" style="cursor:pointer; pointer-events:auto;"/>
          <polygon points="87,-2 93,1 87,4" fill="#fff" pointer-events="none"/>
          <text class="val-text comp-label resistor-val val-trigger" x="72" y="48" text-anchor="middle" font-size="10" font-weight="bold" fill="currentColor" style="cursor:pointer; pointer-events:auto;">10k</text>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-in-1', vState); 
        this.setPinActive('pin-out-0', vState);
        
        const text = this.contentDiv.querySelector('.anim-text');
        if (text) text.textContent = (this.compData.state || '50') + '%';
        
        const valText = this.contentDiv.querySelector('.val-text');
        if (valText) {
            let val = this.compData.customValue || 10000;
            let displayVal = val >= 1000000 ? (val/1000000) + 'M' : (val >= 1000 ? (val/1000) + 'k' : val);
            valText.textContent = displayVal + 'Ω';
        }
    }
}
UIRegistry['potentiometer'] = PotentiometerUI;

class FlasherUI extends BaseUIComponent {
    static getDimensions() { return [80, 40]; }
    getSVG() {
        return `<svg width="80" height="40" viewBox="0 0 80 40">
            <line class="pin-in-0" x1="0" y1="20" x2="25" y2="20" stroke="#006600" stroke-width="3"/>
            <line class="pin-out-0" x1="55" y1="20" x2="80" y2="20" stroke="#006600" stroke-width="3"/>
            <rect class="anim-body" x="25" y="8" width="30" height="24" rx="4" fill="#e2e8f0" stroke="#1e293b" stroke-width="2"/>
            <circle class="anim-indicator" cx="40" cy="17" r="4" fill="#475569"/>
            <text class="anim-text speed-val" x="40" y="38" text-anchor="middle" font-size="8" fill="#4f46e5"></text>
            <polygon class="control-btn speed-btn-up" points="60,16 68,16 64,9" fill="#22c55e" style="cursor:pointer; pointer-events:auto;"/>
            <polygon class="control-btn speed-btn-down" points="60,20 68,20 64,27" fill="#ef4444" style="cursor:pointer; pointer-events:auto;"/>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        const isOn = this.compData.state === '1';
        
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', isOn && vState);
        
        const ind = this.contentDiv.querySelector('.anim-indicator');
        if (ind) ind.setAttribute('fill', (isOn && vState) ? '#facc15' : '#475569');
        
        const speedTxt = this.contentDiv.querySelector('.speed-val');
        if (speedTxt) {
            const periodMs = this.compData.customValue || 500;
            speedTxt.textContent = (1000 / periodMs / 2).toFixed(1) + 'Hz'; 
        }
    }
}
UIRegistry['flasher'] = FlasherUI;

// =========================================================
// 3. IMPLEMENTASI KELAS KOMPONEN (BAGIAN 3.2: AKTUATOR & RELAY)
// =========================================================

// -----------------------------------------------------
// KELOMPOK AKTUATOR (MOTOR, SERVO, SOLENOID)
// -----------------------------------------------------
class MotorDCUI extends BaseUIComponent {
    static getDimensions() { return [80, 80]; }
    getSVG() {
        return `<svg width="80" height="80" viewBox="0 0 80 80">
        <line class="pin-in-0" x1="0" y1="40" x2="20" y2="40" stroke="#006600" stroke-width="2"/>
        <line class="pin-out-0" x1="60" y1="40" x2="80" y2="40" stroke="#006600" stroke-width="2"/>
        <circle cx="40" cy="40" r="20" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
        <g class="anim-rotor" style="transform-origin: 40px 40px;">
            <circle cx="40" cy="40" r="14" fill="none" stroke="#1e293b" stroke-width="1.5" stroke-dasharray="4 4"/>
            <line x1="40" y1="26" x2="40" y2="54" stroke="#1e293b" stroke-width="1.5"/>
            <line x1="26" y1="40" x2="54" y2="40" stroke="#1e293b" stroke-width="1.5"/>
            <circle cx="40" cy="40" r="4" fill="#1e293b"/>
        </g>
        <text x="40" y="16" class="val-trigger" text-anchor="middle" font-size="9" font-weight="bold" fill="#4f46e5" style="cursor:pointer; pointer-events:auto;">DC MOTOR</text>
        <text class="rpm-text" x="40" y="70" text-anchor="middle" font-size="10" font-weight="bold" fill="#0ea5e9">0 RPM</text>
        </svg>`;
    }
    updateState(isSimActive) {
        const rpmText = this.contentDiv.querySelector('.rpm-text');
        if (rpmText) rpmText.textContent = `${this.compData.rpm || 0} RPM`;

        if (typeof this.compData.visualAngle === 'undefined') this.compData.visualAngle = 0;
        let visualSpeed = (this.compData.rpm || 0) * 0.05;
        
        // Mencegah Wagon-Wheel Effect pada UI
        if (visualSpeed > 25) visualSpeed = 25;
        if (visualSpeed < -25) visualSpeed = -25;

        this.compData.visualAngle = (this.compData.visualAngle + visualSpeed) % 360;
        const rotor = this.contentDiv.querySelector('.anim-rotor');
        if (rotor) {
            rotor.style.transform = `rotate(${this.compData.visualAngle}deg)`;
        }
    }
}
UIRegistry['motor_dc'] = MotorDCUI;

class ServoUI extends BaseUIComponent {
    static getDimensions() { return [80, 80]; }
    getSVG() {
        return `<svg width="80" height="80" viewBox="0 0 80 80">
          <line class="pin-in-0" x1="0" y1="20" x2="15" y2="20" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-1" x1="0" y1="40" x2="15" y2="40" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-2" x1="0" y1="60" x2="15" y2="60" stroke="#006600" stroke-width="3"/>
          <rect class="anim-body" x="15" y="10" width="45" height="60" rx="4" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <text x="18" y="24" class="comp-label" font-size="9">SIG</text>
          <text x="18" y="44" class="comp-label" font-size="9" fill="red">VCC</text>
          <text x="18" y="64" class="comp-label" font-size="9">GND</text>
          <circle cx="60" cy="40" r="12" fill="#fff" stroke="#1e293b" stroke-width="3"/>
          <g class="anim-horn" style="transform-origin: 60px 40px;">
              <line x1="60" y1="40" x2="60" y2="15" stroke="#ef4444" stroke-width="4" stroke-linecap="round"/>
          </g>
          <text class="anim-text comp-label" x="38" y="78" text-anchor="middle" font-weight="bold" fill="#d97706">0°</text>
        </svg>`;
    }
    updateState(isSimActive) {
        let isPowered = this.compData.isPowered || false;
        let angle = this.compData.servoAngle || 0;

        this.setPinActive('pin-in-0', angle > 0); 
        this.setPinActive('pin-in-1', isPowered); 
        this.setPinActive('pin-in-2', isPowered);
        
        const horn = this.contentDiv.querySelector('.anim-horn');
        if (horn) horn.style.transform = `rotate(${angle}deg)`;
        
        const text = this.contentDiv.querySelector('.anim-text');
        if (text) text.textContent = Math.round(angle) + '°' + (isPowered ? '' : ' (OFF)');
    }
}
UIRegistry['servo'] = ServoUI;

class SolenoidUI extends BaseUIComponent {
    static getDimensions() { return [80, 60]; }
    getSVG() {
        return `<svg width="80" height="60" viewBox="0 0 80 60">
          <line class="pin-in-0" x1="0" y1="30" x2="15" y2="30" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="65" y1="30" x2="80" y2="30" stroke="#006600" stroke-width="3"/>
          <rect class="anim-body" x="15" y="15" width="40" height="30" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <path d="M 20 15 v 30 M 25 15 v 30 M 30 15 v 30 M 35 15 v 30 M 40 15 v 30" stroke="#1e293b" stroke-width="1"/>
          <rect class="anim-plunger" x="55" y="25" width="20" height="10" fill="#64748b" stroke="#1e293b" stroke-width="1"/>
          <text x="35" y="55" class="comp-label" text-anchor="middle">VALVE</text>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = (this.compData.simV || 0) > 0;
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', vState);
        
        const plunger = this.contentDiv.querySelector('.anim-plunger');
        if (plunger) {
            let currentPos = this.compData.plungerPos || 0; 
            plunger.style.transform = `translateX(-${currentPos}px)`;
            const isFullyRetracted = (this.compData.strokePercent || 0) > 95;
            plunger.setAttribute('fill', isFullyRetracted ? '#ef4444' : '#64748b');
        }
    }
}
UIRegistry['solenoid'] = SolenoidUI;

// -----------------------------------------------------
// KELOMPOK RELAY ELEKTROMAGNETIK
// -----------------------------------------------------
class Relay4PinUI extends BaseUIComponent {
    static getDimensions() { return [80, 80]; }
    getSVG() {
        return `<svg width="80" height="80" viewBox="0 0 80 80">
          <line class="pin-in-0" x1="0" y1="20" x2="25" y2="20" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="55" y1="20" x2="80" y2="20" stroke="#006600" stroke-width="3"/>
          <rect class="anim-body" x="25" y="10" width="30" height="20" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <line class="pin-in-1" x1="0" y1="60" x2="25" y2="60" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-1" x1="55" y1="60" x2="80" y2="60" stroke="#006600" stroke-width="3"/>
          <line class="anim-line" x1="25" y1="60" x2="50" y2="50" stroke="black" stroke-width="3"/>
          <text x="12" y="16" class="comp-label" font-weight="bold" font-size="10" text-anchor="middle">85</text>
          <text x="68" y="16" class="comp-label" font-weight="bold" font-size="10" text-anchor="middle">86</text>
          <text x="12" y="56" class="comp-label" font-weight="bold" font-size="10" text-anchor="middle">30</text>
          <text x="68" y="56" class="comp-label" font-weight="bold" font-size="10" text-anchor="middle">87</text>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        const isActive = this.compData.state === '1';
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', vState); 
        this.setPinActive('pin-in-1', vState); 
        this.setPinActive('pin-out-1', isActive && vState);
        
        const body = this.contentDiv.querySelector('.anim-body'); 
        const path = this.contentDiv.querySelector('.anim-path'); 
        const line = this.contentDiv.querySelector('.anim-line');
        if (body) { 
            body.setAttribute('fill', isActive ? '#fef08a' : '#e8e6d3'); 
            body.setAttribute('stroke', isActive ? '#eab308' : '#1e293b'); 
        }
        if (path) path.setAttribute('stroke', isActive ? '#eab308' : '#1e293b');
        if (line) { 
            line.setAttribute('x2', isActive ? '55' : '50'); 
            line.setAttribute('y2', isActive ? '60' : '50'); 
        }
    }
}
UIRegistry['relay'] = Relay4PinUI;

class Relay5PinUI extends BaseUIComponent {
    static getDimensions() { return [80, 100]; }
    getSVG() {
        return `<svg width="80" height="100" viewBox="0 0 80 100">
          <line class="pin-in-0" x1="0" y1="20" x2="25" y2="20" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="55" y1="20" x2="80" y2="20" stroke="#006600" stroke-width="3"/>
          <rect class="anim-body" x="25" y="10" width="30" height="20" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <text x="12" y="16" class="comp-label" font-weight="bold" font-size="10" text-anchor="middle">85</text>
          <text x="68" y="16" class="comp-label" font-weight="bold" font-size="10" text-anchor="middle">86</text>
          <line class="pin-in-1" x1="0" y1="70" x2="25" y2="70" stroke="#006600" stroke-width="3"/> 
          <line class="pin-out-1" x1="55" y1="50" x2="80" y2="50" stroke="#006600" stroke-width="3"/> 
          <line class="pin-out-2" x1="55" y1="90" x2="80" y2="90" stroke="#006600" stroke-width="3"/> 
          <circle cx="25" cy="70" r="3" fill="#1e293b"/>
          <circle cx="55" cy="50" r="3" fill="#1e293b"/>
          <circle cx="55" cy="90" r="3" fill="#1e293b"/>
          <line class="anim-line" x1="25" y1="70" x2="55" y2="50" stroke="black" stroke-width="3" style="transition: transform 0.1s, y2 0.1s;"/>
          <text x="12" y="66" class="comp-label" font-weight="bold" font-size="10" text-anchor="middle">30</text>
          <text x="68" y="46" class="comp-label" font-weight="bold" font-size="10" text-anchor="middle">87a</text>
          <text x="68" y="86" class="comp-label" font-weight="bold" font-size="10" text-anchor="middle">87</text>
        </svg>`;
    }
    updateState(isSimActive) {
        const vState = this.compData.simV > 0;
        const isActive = this.compData.state === '1';
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', vState); 
        this.setPinActive('pin-in-1', vState); 
        this.setPinActive('pin-out-1', !isActive && vState); // NC (87a)
        this.setPinActive('pin-out-2', isActive && vState);  // NO (87)
        
        const body = this.contentDiv.querySelector('.anim-body'); 
        const line = this.contentDiv.querySelector('.anim-line');
        if (body) { 
          body.setAttribute('fill', isActive ? '#fef08a' : '#e8e6d3'); 
          body.setAttribute('stroke', isActive ? '#eab308' : '#1e293b'); 
        }
        if (line) { 
          line.setAttribute('y2', isActive ? '90' : '50'); 
        }
    }
}
UIRegistry['relay_5pin'] = Relay5PinUI;

// =========================================================
// 3. IMPLEMENTASI KELAS KOMPONEN (BAGIAN 3.3: OSILOSKOP DUAL CHANNEL)
// =========================================================

const vDivScale = [5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01]; 
const tDivScale = [1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001, 0.0005, 0.0002, 0.0001, 0.00005, 0.00002, 0.00001];

class OscilloscopeUI extends BaseUIComponent {
    static getDimensions() { return [410, 280]; }
    
    getSVG() {
        const id = this.id; 
        return `<svg width="410" height="280" viewBox="0 0 410 280">
          <rect x="5" y="5" width="400" height="270" rx="8" fill="#1e293b" stroke="#0f172a" stroke-width="3"/>
          <text x="205" y="24" font-size="10" font-weight="bold" fill="#94a3b8" text-anchor="middle" letter-spacing="1">DUAL CHANNEL DSO</text>

          <rect x="30" y="40" width="200" height="160" fill="#020617" stroke="#334155" stroke-width="2"/>
          <defs>
            <pattern id="grid_${id}" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0f766e" stroke-width="0.5" stroke-dasharray="2,2"/></pattern>
            <clipPath id="clip_osc_${id}"><rect x="30" y="40" width="200" height="160" /></clipPath>
          </defs>
          <rect x="30" y="40" width="200" height="160" fill="url(#grid_${id})" />
          
          <line x1="30" y1="120" x2="230" y2="120" stroke="#0d9488" stroke-width="1.5"/>
          <line x1="130" y1="40" x2="130" y2="200" stroke="#0d9488" stroke-width="1.5"/>
          
          <!-- 🟢 PERUBAHAN UTAMA: 3 tag <polyline> dihapus dan diganti dengan 1 Canvas -->
          <foreignObject x="30" y="40" width="200" height="160">
            <canvas class="osc-canvas-screen" width="200" height="160" xmlns="http://www.w3.org/1999/xhtml" style="pointer-events:none;"></canvas>
          </foreignObject>
          
          <!-- Kursor Pengukuran (Smart OSD) -->
          <g class="cursors-group" style="display:none;">
            <line class="cur-v1" x1="30" y1="80" x2="230" y2="80" stroke="#eab308" stroke-width="1.5" stroke-dasharray="4,2" pointer-events="none" />
            <line class="cur-v2" x1="30" y1="160" x2="230" y2="160" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="4,2" pointer-events="none" />
            <line class="cur-t1" x1="80" y1="40" x2="80" y2="200" stroke="#eab308" stroke-width="1.5" stroke-dasharray="4,2" pointer-events="none" />
            <line class="cur-t2" x1="180" y1="40" x2="180" y2="200" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="4,2" pointer-events="none" />
            
            <line class="cur-v1-hit" x1="30" y1="80" x2="230" y2="80" stroke="transparent" stroke-width="12" style="cursor:ns-resize; pointer-events:auto;" />
            <line class="cur-v2-hit" x1="30" y1="160" x2="230" y2="160" stroke="transparent" stroke-width="12" style="cursor:ns-resize; pointer-events:auto;" />
            <line class="cur-t1-hit" x1="80" y1="40" x2="80" y2="200" stroke="transparent" stroke-width="12" style="cursor:ew-resize; pointer-events:auto;" />
            <line class="cur-t2-hit" x1="180" y1="40" x2="180" y2="200" stroke="transparent" stroke-width="12" style="cursor:ew-resize; pointer-events:auto;" />
          </g>

          <g class="cur-osd" style="display:none;">
            <rect x="35" y="45" width="100" height="50" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#334155" stroke-width="1"/>
            <text class="cur-title" x="85" y="56" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle">CURSOR</text>
            <text class="cur-txt-1" x="40" y="68" font-size="8" fill="#eab308">1: ---</text>
            <text class="cur-txt-2" x="40" y="80" font-size="8" fill="#06b6d4">2: ---</text>
            <text class="cur-txt-d" x="40" y="92" font-size="8" font-weight="bold" fill="#22c55e">Δ: ---</text>
          </g>

          <g class="meas-overlay" style="display:none;">
            <rect x="40" y="45" width="180" height="95" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#334155" stroke-width="1"/>
            <text class="meas-title" x="130" y="56" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle">MEASURE CH1</text>
            <line x1="45" y1="61" x2="215" y2="61" stroke="#334155" stroke-width="1"/>
            
            <text x="45" y="72" font-size="8" font-weight="bold" fill="#94a3b8">Vpp : <tspan class="m-vpp" fill="#fff">0.00V</tspan></text>
            <text x="45" y="84" font-size="8" font-weight="bold" fill="#94a3b8">Vmax: <tspan class="m-vmax" fill="#fff">0.00V</tspan></text>
            <text x="45" y="96" font-size="8" font-weight="bold" fill="#94a3b8">Vmin: <tspan class="m-vmin" fill="#fff">0.00V</tspan></text>
            <text x="45" y="108" font-size="8" font-weight="bold" fill="#94a3b8">Vamp: <tspan class="m-vamp" fill="#fff">0.00V</tspan></text>
            <text x="45" y="120" font-size="8" font-weight="bold" fill="#94a3b8">Vrms: <tspan class="m-vrms" fill="#fff">0.00V</tspan></text>
            <text x="45" y="132" font-size="8" font-weight="bold" fill="#94a3b8">Vavg: <tspan class="m-vavg" fill="#fff">0.00V</tspan></text>

            <text x="135" y="72" font-size="8" font-weight="bold" fill="#94a3b8">Freq: <tspan class="m-freq" fill="#fff">---</tspan></text>
            <text x="135" y="84" font-size="8" font-weight="bold" fill="#94a3b8">Per : <tspan class="m-per" fill="#fff">---</tspan></text>
            <text x="135" y="96" font-size="8" font-weight="bold" fill="#94a3b8">Duty: <tspan class="m-duty" fill="#fff">---</tspan></text>
            <text x="135" y="108" font-size="8" font-weight="bold" fill="#94a3b8">P.W : <tspan class="m-pw" fill="#fff">---</tspan></text>
            <text x="135" y="120" font-size="8" font-weight="bold" fill="#94a3b8">Rise: <tspan class="m-rise" fill="#fff">---</tspan></text>
            <text x="135" y="132" font-size="8" font-weight="bold" fill="#94a3b8">Fall: <tspan class="m-fall" fill="#fff">---</tspan></text>
          </g>

          <!-- Teks Panel Info Dasar -->
          <text x="35" y="222" class="tdiv-text" font-size="9" font-family="monospace" fill="#38bdf8">T/Div: 1.0s</text>
          <text x="135" y="222" class="tlvl-text" font-size="9" font-family="monospace" fill="#a855f7">Trig: 0.0V</text>
          <text x="35" y="240" class="vdiv1-text" font-size="9" font-family="monospace" fill="#eab308">CH1: 5V/div</text>
          <text x="135" y="240" class="val1-text" font-size="9" font-family="monospace" fill="#eab308" font-weight="bold">V1: 0.00V</text>
          <text x="35" y="258" class="vdiv2-text" font-size="9" font-family="monospace" fill="#06b6d4">CH2: 5V/div</text>
          <text x="135" y="258" class="val2-text" font-size="9" font-family="monospace" fill="#06b6d4" font-weight="bold">V2: 0.00V</text>
          
          <circle cx="15" cy="100" r="4" fill="#eab308" stroke="#0f172a" stroke-width="1"/>
          <line x1="15" y1="100" x2="30" y2="100" stroke="#eab308" stroke-width="2"/>
          <circle cx="15" cy="140" r="4" fill="#06b6d4" stroke="#0f172a" stroke-width="1"/>
          <line x1="15" y1="140" x2="30" y2="140" stroke="#06b6d4" stroke-width="2"/>

          <!-- Panel Kontrol (Tombol-tombol) -->
          <rect class="osc-panel" x="240" y="35" width="155" height="230" rx="4" fill="#334155" stroke="#475569" stroke-width="1"/>
          
          <text x="265" y="48" font-size="7" font-weight="bold" fill="#cbd5e1" text-anchor="middle">CH SEL</text>
          <rect class="btn-ch-sel control-btn" x="245" y="52" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text class="ch-sel-txt" x="265" y="62" font-size="8" font-weight="bold" fill="#eab308" text-anchor="middle" pointer-events="none">CH1</text>
          
          <text x="265" y="74" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">V/DIV</text>
          <rect class="btn-vdiv-up control-btn" x="245" y="78" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text x="265" y="88" font-size="8" fill="#fff" text-anchor="middle" pointer-events="none">▲</text>
          <rect class="btn-vdiv-dn control-btn" x="245" y="94" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text x="265" y="104" font-size="8" fill="#fff" text-anchor="middle" pointer-events="none">▼</text>
          
          <text x="265" y="116" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">Y-POS</text>
          <rect class="btn-ypos-up control-btn" x="245" y="120" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text x="265" y="130" font-size="8" fill="#fff" text-anchor="middle" pointer-events="none">▲</text>
          <rect class="btn-ypos-dn control-btn" x="245" y="136" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text x="265" y="146" font-size="8" fill="#fff" text-anchor="middle" pointer-events="none">▼</text>
          
          <text x="265" y="158" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">IN CPL</text>
          <rect class="btn-ch-coupl control-btn" x="245" y="162" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text class="ch-coupl-txt" x="265" y="172" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">DC</text>
          
          <rect class="btn-invert control-btn" x="245" y="184" width="40" height="16" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text class="inv-text" x="265" y="195" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">INV</text>

          <rect class="btn-ch-en control-btn" x="245" y="206" width="40" height="16" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text class="ch-en-text" x="265" y="217" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">ON</text>
          <rect class="btn-run-stop control-btn" x="345" y="206" width="40" height="16" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text class="run-stop-text" x="365" y="217" font-size="8" font-weight="bold" fill="#10b981" text-anchor="middle" pointer-events="none">RUN</text>

          <text x="315" y="48" font-size="8" font-weight="bold" fill="#cbd5e1" text-anchor="middle">HORIZ</text>
          <text x="315" y="204" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">CURS</text>
          <rect class="btn-cursor control-btn" x="295" y="206" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text class="cursor-txt" x="315" y="216" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">OFF</text>
          
          <rect class="btn-autoset control-btn" x="245" y="228" width="40" height="14" rx="2" fill="#3b82f6" style="cursor:pointer;"/>
          <text class="autoset-txt" x="265" y="238" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">AUTO</text>

          <rect class="btn-print control-btn" x="295" y="228" width="40" height="14" rx="2" fill="#8b5cf6" style="cursor:pointer;"/>
          <text class="print-txt" x="315" y="238" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">IMG</text>

          <text x="315" y="60" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">T/DIV</text>
          <rect class="btn-tdiv-dn control-btn" x="295" y="64" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text x="315" y="74" font-size="8" fill="#fff" text-anchor="middle" pointer-events="none">◀</text>
          <rect class="btn-tdiv-up control-btn" x="295" y="80" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text x="315" y="90" font-size="8" fill="#fff" text-anchor="middle" pointer-events="none">▶</text>

          <text x="315" y="102" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">X-POS</text>
          <rect class="btn-xpos-dn control-btn" x="295" y="106" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text x="315" y="116" font-size="8" fill="#fff" text-anchor="middle" pointer-events="none">◀</text>
          <rect class="btn-xpos-up control-btn" x="295" y="122" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text x="315" y="132" font-size="8" fill="#fff" text-anchor="middle" pointer-events="none">▶</text>
          
          <text x="315" y="150" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">DISP</text>
          <rect class="btn-disp-mode control-btn" x="295" y="154" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text x="315" y="180" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">MEAS</text>
          <rect class="btn-meas control-btn" x="295" y="184" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text class="meas-txt" x="315" y="194" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">OFF</text>
          <text class="disp-mode-txt" x="315" y="164" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">Y-T</text>

          <text x="365" y="48" font-size="8" font-weight="bold" fill="#cbd5e1" text-anchor="middle">TRIGGER</text>
          <text x="365" y="60" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">MODE</text>
          <rect class="btn-trig-mode control-btn" x="345" y="64" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text class="trig-mode-txt" x="365" y="74" font-size="7" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">AUTO</text>

          <text x="365" y="86" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">SLOPE</text>
          <rect class="btn-trig-slope control-btn" x="345" y="90" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text class="trig-slope-txt" x="365" y="100" font-size="8" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">RISE ↑</text>

          <text x="365" y="112" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">LEVEL</text>
          <rect class="btn-trig-lvl-up control-btn" x="345" y="116" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text x="365" y="126" font-size="8" fill="#fff" text-anchor="middle" pointer-events="none">▲</text>
          <rect class="btn-trig-lvl-dn control-btn" x="345" y="132" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text x="365" y="142" font-size="8" fill="#fff" text-anchor="middle" pointer-events="none">▼</text>

          <text x="365" y="154" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">TR CPL</text>
          <rect class="btn-trig-coupl control-btn" x="345" y="158" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text class="trig-coupl-txt" x="365" y="168" font-size="7" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">DC</text>

          <text x="365" y="180" font-size="7" font-weight="bold" fill="#94a3b8" text-anchor="middle">SRC</text>
          <rect class="btn-trig-src control-btn" x="345" y="184" width="40" height="14" rx="2" fill="#475569" style="cursor:pointer;"/>
          <text class="trig-src-txt" x="365" y="194" font-size="7" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">CH1</text>

          <polygon class="ypos-ind-1" points="230,120 235,116 235,124" fill="#eab308"/>
          <polygon class="ypos-ind-2" points="230,120 235,116 235,124" fill="#06b6d4"/>
          <polygon class="xpos-indicator" points="130,40 126,35 134,35" fill="#eab308"/>
          <polygon class="lvl-indicator" points="230,120 225,116 225,124" fill="#a855f7"/>
        </svg>`;
    }

    bindSpecificEvents() {
        const contentDiv = this.contentDiv;
        const id = this.id;

        const bindBtn = (cls, action) => {
            const btn = contentDiv.querySelector(cls);
            if (!btn) return;
            const handleInteract = (e) => {
                e.stopPropagation(); e.preventDefault(); 
                const currentComp = typeof CircuitStore !== 'undefined' ? CircuitStore.components.find(c => c.id === id) : null;
                if (!currentComp) return;
                action(currentComp); 
                // Segarkan interface panel segera
                if (contentDiv.uiInstance) contentDiv.uiInstance.updateState(typeof CircuitStore !== 'undefined' ? CircuitStore.isSimulationActive : false);
                if (typeof HistoryManager !== 'undefined') HistoryManager.pushCommand('CHANGE_PARAM', null, 'Ubah setting osiloskop');
            };
            btn.addEventListener('mousedown', handleInteract);
            btn.addEventListener('touchstart', handleInteract, {passive: false});
        };

        bindBtn('.btn-meas', (c) => { c.measActive = !c.measActive; });
        
        bindBtn('.btn-run-stop', (c) => { 
            c.isRun = !c.isRun; 
            if (c.isRun) {
                c.lastTrigTime = Date.now(); 
                if (c.trigMode === 2 && c.trigState === 'STOP') {
                    c.trigState = 'WAIT';
                }
            }
        });
        bindBtn('.btn-ch-en', (c) => { let ch = c.activeCh === 1 ? c.ch1 : c.ch2; ch.enabled = !ch.enabled; });
        bindBtn('.btn-cursor', (c) => { c.cursorActive = !c.cursorActive; });

        bindBtn('.btn-autoset', (c) => {
            let chInfo = c.activeCh === 1 ? c.ch1 : c.ch2;
            let hist = c.activeCh === 1 ? c.history1 : c.history2; 
            
            let vMax = -Infinity, vMin = Infinity;
            for(let i = 2000; i < 3000; i++) {
                let v = hist[i];
                if (v > vMax) vMax = v;
                if (v < vMin) vMin = v;
            }
            if (vMax === -Infinity || vMax === vMin) { vMax = 1; vMin = -1; } 
            
            let vPp = vMax - vMin;
            let vMid = (vMax + vMin) / 2;

            chInfo.yPosition = 0;
            c.trigLevel = vMid;

            let targetVDiv = vPp / 4;
            let bestVIndex = 0;
            for (let i = 0; i < vDivScale.length; i++) {
                if (vDivScale[i] >= targetVDiv) bestVIndex = i;
            }
            chInfo.vDivIndex = bestVIndex;

            let edges = [], isH = hist[2000] > vMid;
            for(let i = 2001; i < 3000; i++) {
                let currentH = hist[i] > vMid;
                if (currentH !== isH) { edges.push({ type: currentH ? 'rise' : 'fall', idx: i }); isH = currentH; }
            }
            let validPeriods = [];
            for(let i = 0; i < edges.length; i++) {
                if (edges[i].type === 'rise') {
                    let nextRise = edges.find((e, idx) => idx > i && e.type === 'rise');
                    if (nextRise) validPeriods.push(nextRise.idx - edges[i].idx);
                }
            }
            
            if (validPeriods.length > 0) {
                let avgPeriodPoints = validPeriods.reduce((a,b)=>a+b) / validPeriods.length;
                let currentTPerDiv = tDivScale[c.tDivIndex];
                let targetTPerDiv = currentTPerDiv * (avgPeriodPoints / 80); 
                
                let bestTIndex = 0, minDiff = Infinity;
                for (let i = 0; i < tDivScale.length; i++) {
                    let diff = Math.abs(tDivScale[i] - targetTPerDiv);
                    if (diff < minDiff) { minDiff = diff; bestTIndex = i; }
                }
                c.tDivIndex = bestTIndex;
            }

            c.xPosition = 0; c.dispMode = 0; c.trigMode = 0; c.isRun = true; 
        });

        // FUNGSI SCREENSHOT TETAP SAMA
        bindBtn('.btn-print', (c) => {
            // Karena kita menggunakan Canvas sekarang, kita harus merekayasa ekspornya
            // (Logika ekspor Canvas gabungan dengan SVG bisa ditambahkan belakangan jika diperlukan)
            if(typeof UIManager !== 'undefined') UIManager.showToast('Fitur Print sedang disesuaikan dengan Engine Canvas yang baru!');
        });
        
        // FUNGSI DRAG KURSOR (Smart OSD)
        const setupCursorDrag = (hitCls, visualCls, axis, prop, mode) => {
            const hitLine = contentDiv.querySelector(hitCls);
            if (!hitLine) return;
            
            const startDrag = (e) => {
                const currentComp = typeof CircuitStore !== 'undefined' ? CircuitStore.components.find(c => c.id === id) : null;
                if (!currentComp || !currentComp.cursorActive) return;
                e.preventDefault(); e.stopPropagation();
                currentComp.lastCursorMode = mode; 
                
                let startPos = axis === 'y' ? (e.touches ? e.touches[0].clientY : e.clientY) : (e.touches ? e.touches[0].clientX : e.clientX);
                let startVal = currentComp[prop];

                const onMove = (moveEvent) => {
                    let currentPos = axis === 'y' ? (moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY) : (moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX);
                    let zoomLevel = typeof UIManager !== 'undefined' ? UIManager.currentZoom : 1;
                    let delta = (currentPos - startPos) / zoomLevel;
                    
                    let newVal = startVal + delta;
                    if (axis === 'y') newVal = Math.max(40, Math.min(200, newVal));
                    if (axis === 'x') newVal = Math.max(30, Math.min(230, newVal));
                    
                    currentComp[prop] = newVal;
                    
                    let hL = contentDiv.querySelector(hitCls);
                    let vL = contentDiv.querySelector(visualCls);
                    if (hL && vL) {
                        if (axis === 'y') { hL.setAttribute('y1', newVal); hL.setAttribute('y2', newVal); vL.setAttribute('y1', newVal); vL.setAttribute('y2', newVal); }
                        else { hL.setAttribute('x1', newVal); hL.setAttribute('x2', newVal); vL.setAttribute('x1', newVal); vL.setAttribute('x2', newVal); }
                    }
                };
                
                const onEnd = () => {
                    document.removeEventListener('mousemove', onMove); document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('mouseup', onEnd); document.removeEventListener('touchend', onEnd);
                };
                
                document.addEventListener('mousemove', onMove); document.addEventListener('touchmove', onMove, {passive: false});
                document.addEventListener('mouseup', onEnd); document.addEventListener('touchend', onEnd);
            };
            hitLine.addEventListener('mousedown', startDrag);
            hitLine.addEventListener('touchstart', startDrag, {passive: false});
        };

        setupCursorDrag('.cur-v1-hit', '.cur-v1', 'y', 'curV1Y', 'V');
        setupCursorDrag('.cur-v2-hit', '.cur-v2', 'y', 'curV2Y', 'V');
        setupCursorDrag('.cur-t1-hit', '.cur-t1', 'x', 'curT1X', 'T');
        setupCursorDrag('.cur-t2-hit', '.cur-t2', 'x', 'curT2X', 'T');

        bindBtn('.btn-ch-sel', (c) => { c.activeCh = c.activeCh === 1 ? 2 : 1; });
        bindBtn('.btn-vdiv-up', (c) => { let ch = c.activeCh === 1 ? c.ch1 : c.ch2; if (ch.vDivIndex > 0) ch.vDivIndex--; });
        bindBtn('.btn-vdiv-dn', (c) => { let ch = c.activeCh === 1 ? c.ch1 : c.ch2; if (ch.vDivIndex < vDivScale.length - 1) ch.vDivIndex++; });
        bindBtn('.btn-ypos-up', (c) => { let ch = c.activeCh === 1 ? c.ch1 : c.ch2; ch.yPosition += 0.5; });
        bindBtn('.btn-ypos-dn', (c) => { let ch = c.activeCh === 1 ? c.ch1 : c.ch2; ch.yPosition -= 0.5; });
        bindBtn('.btn-invert', (c) => { let ch = c.activeCh === 1 ? c.ch1 : c.ch2; ch.invert = !ch.invert; });
        bindBtn('.btn-ch-coupl', (c) => { let ch = c.activeCh === 1 ? c.ch1 : c.ch2; ch.coupl = (ch.coupl + 1) % 3; });
        
        bindBtn('.btn-tdiv-dn', (c) => { if (c.tDivIndex > 0) c.tDivIndex--; });
        bindBtn('.btn-tdiv-up', (c) => { if (c.tDivIndex < tDivScale.length - 1) c.tDivIndex++; });
        bindBtn('.btn-xpos-dn', (c) => { if (c.xPosition > -10) c.xPosition -= 0.5; }); 
        bindBtn('.btn-xpos-up', (c) => { if (c.xPosition < 10) c.xPosition += 0.5; });  
        bindBtn('.btn-disp-mode', (c) => { c.dispMode = (c.dispMode + 1) % 3; });

        bindBtn('.btn-trig-mode', (c) => { 
            c.trigMode = (c.trigMode + 1) % 3; 
            c.trigState = 'WAIT'; 
            c.isRun = true;
            c.lastTrigTime = Date.now(); 
        });
        bindBtn('.btn-trig-slope', (c) => { c.trigSlope = c.trigSlope === 0 ? 1 : 0; });
        bindBtn('.btn-trig-coupl', (c) => { c.trigCoupl = (c.trigCoupl + 1) % 4; });
        bindBtn('.btn-trig-src', (c) => { c.trigSource = (c.trigSource + 1) % 2; }); 
        bindBtn('.btn-trig-lvl-up', (c) => { 
            let step = vDivScale[(c.trigSource === 0 ? c.ch1 : c.ch2).vDivIndex] * 0.2;
            c.trigLevel += step; 
        });
        bindBtn('.btn-trig-lvl-dn', (c) => { 
            let step = vDivScale[(c.trigSource === 0 ? c.ch1 : c.ch2).vDivIndex] * 0.2;
            c.trigLevel -= step; 
        });
    }

    updateState(isSimActive) {
        const realComp = this.compData;
        const contentDiv = this.contentDiv;
        
        if (realComp.measActive === undefined) realComp.measActive = false; 
        
        // 1. INISIALISASI BUFFER GANDA (ACQUISITION & DISPLAY)
        if (!realComp.ch1) {
            realComp.ch1 = { vDivIndex: realComp.vDivIndex||0, yPosition: realComp.yPosition||0, invert: realComp.invert||false, coupl: 0, dcOffset: 0 };
            realComp.ch2 = { vDivIndex: 0, yPosition: 0, invert: false, coupl: 0, dcOffset: 0 };
            realComp.activeCh = 1; 
        }
        if (!realComp.history1) realComp.history1 = new Array(3000).fill(0);
        if (!realComp.history2) realComp.history2 = new Array(3000).fill(0);
        if (!realComp.dispBuf1) realComp.dispBuf1 = new Array(3000).fill(0);
        if (!realComp.dispBuf2) realComp.dispBuf2 = new Array(3000).fill(0);

        // Nilai Default
        if (realComp.ch1.enabled === undefined) realComp.ch1.enabled = true;
        if (realComp.ch2.enabled === undefined) realComp.ch2.enabled = true;
        if (realComp.isRun === undefined) realComp.isRun = true; 
        if (realComp.xPosition === undefined) realComp.xPosition = 0; 
        if (realComp.tDivIndex === undefined) realComp.tDivIndex = 3; 
        if (realComp.dispMode === undefined) realComp.dispMode = 0; 
        if (realComp.trigMode === undefined) realComp.trigMode = 0; 
        if (realComp.trigSource === undefined) realComp.trigSource = 0; 
        if (realComp.trigLevel === undefined) realComp.trigLevel = 0; 
        if (realComp.trigSlope === undefined) realComp.trigSlope = 0; 
        if (realComp.trigCoupl === undefined) realComp.trigCoupl = 0; 
        
        // Variabel Mesin Trigger (DSO Engine)
        if (realComp.trigState === undefined) realComp.trigState = 'WAIT'; 
        if (realComp.lastAcqTrigV === undefined) realComp.lastAcqTrigV = 0;
        if (realComp.postTrigCounter === undefined) realComp.postTrigCounter = 0;
        if (realComp.lastTrigTime === undefined) realComp.lastTrigTime = Date.now();
        if (realComp.trigDcOffset === undefined) realComp.trigDcOffset = 0; 
        if (realComp.trigLowPass === undefined) realComp.trigLowPass = 0; 
        if (realComp.capturedTDiv === undefined) realComp.capturedTDiv = realComp.tDivIndex;

        // Memori Kursor (Tetap dipertahankan)
        if (realComp.cursorActive === undefined) realComp.cursorActive = false; 
        if (realComp.curV1Y === undefined) realComp.curV1Y = 80;  
        if (realComp.curV2Y === undefined) realComp.curV2Y = 160; 
        if (realComp.curT1X === undefined) realComp.curT1X = 80;  
        if (realComp.curT2X === undefined) realComp.curT2X = 180; 
        
        // 2. PEMROSESAN SINYAL (COUPLING & DC BLOCKER)
        let rawV1 = realComp.simV || 0;
        let rawV2 = realComp.simV2 || 0;
        
        realComp.ch1.dcOffset = (realComp.ch1.dcOffset * 0.99) + (rawV1 * 0.01);
        realComp.ch2.dcOffset = (realComp.ch2.dcOffset * 0.99) + (rawV2 * 0.01);

        let v1 = rawV1;
        if (realComp.ch1.coupl === 1) v1 -= realComp.ch1.dcOffset; else if (realComp.ch1.coupl === 2) v1 = 0;
        
        let v2 = rawV2;
        if (realComp.ch2.coupl === 1) v2 -= realComp.ch2.dcOffset; else if (realComp.ch2.coupl === 2) v2 = 0;
        
        let rawTrigSrc = (realComp.trigSource === 0) ? rawV1 : rawV2;
        realComp.trigDcOffset = (realComp.trigDcOffset * 0.99) + (rawTrigSrc * 0.01);
        realComp.trigLowPass = (realComp.trigLowPass * 0.7) + (rawTrigSrc * 0.3);
        
        let trigV = rawTrigSrc; 
        if (realComp.trigCoupl === 1) trigV = rawTrigSrc - realComp.trigDcOffset; 
        else if (realComp.trigCoupl === 2) trigV = realComp.trigLowPass; 
        else if (realComp.trigCoupl === 3) trigV = rawTrigSrc - realComp.trigLowPass; 

        // 3. TIMING & ENGINE ACQUISITION (DSO LOGIC)
        let tPerDiv = tDivScale[realComp.tDivIndex];
        let sampleDelay = (tPerDiv * 10 * 1000) / 200; 
        const now = Date.now();
        if (!realComp.lastOscUpdate) realComp.lastOscUpdate = now;

        if (realComp.lastV1 === undefined) realComp.lastV1 = v1;
        if (realComp.lastV2 === undefined) realComp.lastV2 = v2;
        if (realComp.lastTrig === undefined) realComp.lastTrig = trigV;

        let isPaused = typeof CircuitStore !== 'undefined' ? CircuitStore.isPaused : false;

        if ((isSimActive || isPaused) && realComp.isRun) {
            let elapsed = now - realComp.lastOscUpdate;
            
            // Pelindung Jeda: Cegah gelombang melompat lurus jika ditinggal lama
            if (elapsed > 500) {
                realComp.lastOscUpdate = now;
                realComp.lastTrigTime = now; 
                elapsed = 0;
                realComp.lastV1 = v1; realComp.lastV2 = v2; realComp.lastTrig = trigV;
            }

            if (isSimActive && elapsed >= sampleDelay) {
                let steps = Math.floor(elapsed / sampleDelay);
                if (steps > 300) steps = 300; // Batasi jika CPU lag

                // 🟢 METODE LERP (Linear Interpolation)
                let stepV1 = (v1 - realComp.lastV1) / steps;
                let stepV2 = (v2 - realComp.lastV2) / steps;
                let stepTrig = (trigV - realComp.lastTrig) / steps;

                for(let i = 1; i <= steps; i++) {
                    let interpV1 = realComp.lastV1 + (stepV1 * i);
                    let interpV2 = realComp.lastV2 + (stepV2 * i);
                    let interpTrig = realComp.lastTrig + (stepTrig * i);

                    // A. Merekam data ke Acquisition Buffer (Live)
                    realComp.history1.shift(); realComp.history1.push(interpV1);
                    realComp.history2.shift(); realComp.history2.push(interpV2);

                    // B. STATE MACHINE TRIGGER & STEADY SCREEN
                    if (realComp.dispMode === 2 || realComp.dispMode === 1) {
                        // Mode X-Y (1) dan ROLL (2) menggunakan live data (Free-Run)
                        realComp.dispBuf1.shift(); realComp.dispBuf1.push(interpV1);
                        realComp.dispBuf2.shift(); realComp.dispBuf2.push(interpV2);
                        realComp.capturedTDiv = realComp.tDivIndex;
                        realComp.trigState = realComp.dispMode === 2 ? 'ROLL' : 'X-Y';
                    } else {
                        // MODE Y-T (STEADY / NORMAL)
                        let isTrig = false;
                        if (realComp.trigSlope === 0) {
                            if (realComp.lastAcqTrigV < realComp.trigLevel && interpTrig >= realComp.trigLevel) isTrig = true;
                        } else {
                            if (realComp.lastAcqTrigV > realComp.trigLevel && interpTrig <= realComp.trigLevel) isTrig = true;
                        }

                        if (realComp.trigState === 'WAIT' && isTrig) {
                            realComp.trigState = 'POST_TRIG';
                            let tScale = realComp.capturedTDiv !== undefined ? (tDivScale[realComp.tDivIndex] / tDivScale[realComp.capturedTDiv]) : 1;
                            realComp.postTrigCounter = Math.floor(100 * tScale);
                        }

                        if (realComp.trigState === 'POST_TRIG') {
                            realComp.postTrigCounter--;
                            if (realComp.postTrigCounter <= 0) {
                                // JEPRET! Salin SELURUH memori
                                realComp.lastTrigTime = Date.now();
                                for(let j=0; j<3000; j++) {
                                    realComp.dispBuf1[j] = realComp.history1[j];
                                    realComp.dispBuf2[j] = realComp.history2[j];
                                }
                                realComp.capturedTDiv = realComp.tDivIndex;

                                if (realComp.trigMode === 2) { 
                                    realComp.trigState = 'STOP'; realComp.isRun = false;
                                } else {
                                    realComp.trigState = 'WAIT';
                                }
                            }
                        }

                        // FALLBACK AUTO MODE (Jika kelamaan tidak ada trigger)
                        if (realComp.trigMode === 0 && realComp.trigState === 'WAIT' && (Date.now() - (realComp.lastTrigTime || 0) > 1000)) {
                            realComp.dispBuf1.shift(); realComp.dispBuf1.push(interpV1);
                            realComp.dispBuf2.shift(); realComp.dispBuf2.push(interpV2);
                            realComp.capturedTDiv = realComp.tDivIndex;
                        }
                    }
                    realComp.lastAcqTrigV = interpTrig;
                }
                realComp.lastOscUpdate = now - (elapsed % sampleDelay);
                realComp.lastV1 = v1; realComp.lastV2 = v2; realComp.lastTrig = trigV;
            }
        } else {
            realComp.lastOscUpdate = now; 
            realComp.lastV1 = v1; realComp.lastV2 = v2; realComp.lastTrig = trigV;
        }

        // [BAGIAN 3: DELEGASI KE FUNGSI RENDERING CANVAS]
        this.renderCanvas(isSimActive, isPaused);
    }
    
    renderCanvas(isSimActive, isPaused) {
        const realComp = this.compData;
        const contentDiv = this.contentDiv;
        const canvas = contentDiv.querySelector('.osc-canvas-screen');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d', { alpha: true });
        
        // 1. BERSIHKAN PAPAN TULIS (Hapus Frame Sebelumnya)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let xPixelOffset = realComp.xPosition * 20; 
        let scaleMax1 = vDivScale[realComp.ch1.vDivIndex] * 4;
        let scaleMax2 = vDivScale[realComp.ch2.vDivIndex] * 4;
        let yPx1 = realComp.ch1.yPosition * 20;
        let yPx2 = realComp.ch2.yPosition * 20;
        let inv1 = realComp.ch1.invert ? -1 : 1;
        let inv2 = realComp.ch2.invert ? -1 : 1;

        let tScaleRatio = 1.0;
        if (realComp.capturedTDiv !== undefined) {
            tScaleRatio = tDivScale[realComp.tDivIndex] / tDivScale[realComp.capturedTDiv];
        }

        let anchorIdx = 2999 - xPixelOffset; 
        let isPowerOn = isSimActive || isPaused;

        // ==========================================
        // 2. RENDERING GRAFIK MENGGUNAKAN CANVAS API
        // ==========================================
        if (isPowerOn) {
            if (realComp.dispMode === 0 || realComp.dispMode === 2) {
                // FUNGSI PENGGAMBAR CH1 & CH2 (MODE Y-T & ROLL)
                const drawChannel = (buffer, scaleMax, yPx, inv, color) => {
                    ctx.beginPath();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.lineJoin = 'round';
                    let firstPoint = true;

                    for(let i = 0; i < 200; i++) {
                        let offsetFromRight = i - 199; 
                        let exactIdx = anchorIdx + (offsetFromRight * tScaleRatio);
                        
                        if (exactIdx >= 0 && exactIdx <= 2999) {
                            let px = i; // Posisi X relatif terhadap lebar Canvas (200px)
                            
                            if (tScaleRatio > 1) {
                                // PEAK-DETECT (Anti-Aliasing untuk Zoom Out)
                                let sIdx = Math.floor(exactIdx);
                                let eIdx = Math.min(2999, Math.floor(exactIdx + tScaleRatio));
                                let minV = Infinity, maxV = -Infinity;
                                
                                let pointsToScan = eIdx - sIdx;
                                let scanStep = pointsToScan > 20 ? Math.ceil(pointsToScan / 20) : 1;
                                
                                for(let k = sIdx; k <= eIdx; k += scanStep) {
                                    let v = buffer[k];
                                    if (v < minV) minV = v; if (v > maxV) maxV = v;
                                }
                                if (scanStep > 1) {
                                    let v = buffer[eIdx];
                                    if (v < minV) minV = v; if (v > maxV) maxV = v;
                                }
                                
                                // Mapping ke Canvas Y (Tinggi 160px, Tengah 80px)
                                let py_min = 80 - (((minV * inv) / scaleMax) * 80) - yPx;
                                let py_max = 80 - (((maxV * inv) / scaleMax) * 80) - yPx;
                                
                                if (firstPoint) { ctx.moveTo(px, py_min); firstPoint = false; }
                                else { ctx.lineTo(px, py_min); }
                                ctx.lineTo(px, py_max);
                            } else {
                                // POINT-SAMPLING (Normal & Zoom In)
                                let idx = Math.floor(exactIdx);
                                let py = 80 - (((buffer[idx] * inv) / scaleMax) * 80) - yPx;
                                
                                if (firstPoint) { ctx.moveTo(px, py); firstPoint = false; }
                                else { ctx.lineTo(px, py); }
                            }
                        }
                    }
                    ctx.stroke(); // Eksekusi gambar ke GPU
                };

                // Gambar gelombangnya!
                if (realComp.ch1.enabled) drawChannel(realComp.dispBuf1, scaleMax1, yPx1, inv1, '#eab308');
                if (realComp.ch2.enabled) drawChannel(realComp.dispBuf2, scaleMax2, yPx2, inv2, '#06b6d4');
                
            } else if (realComp.dispMode === 1 && realComp.ch1.enabled && realComp.ch2.enabled) {
                // MODE X-Y (LISSAJOUS)
                ctx.beginPath();
                ctx.strokeStyle = '#10b981'; // Warna Hijau
                ctx.lineWidth = 2;
                let firstPoint = true;

                let startBufferIdx = Math.max(0, Math.floor(anchorIdx - (199 * tScaleRatio)));
                let endBufferIdx = Math.min(2999, Math.floor(anchorIdx));
                let pointsToScan = endBufferIdx - startBufferIdx;
                let scanStep = pointsToScan > 400 ? Math.ceil(pointsToScan / 400) : 1;

                for (let k = startBufferIdx; k <= endBufferIdx; k += scanStep) {
                    let valX = realComp.dispBuf1[k] * inv1;
                    let valY = realComp.dispBuf2[k] * inv2;
                    
                    let px = 100 + ((valX / scaleMax1) * 80) + yPx1; 
                    let py = 80 - ((valY / scaleMax2) * 80) - yPx2;
                    
                    if (px >= 0 && px <= 200 && py >= 0 && py <= 160) { 
                        if (firstPoint) { ctx.moveTo(px, py); firstPoint = false; }
                        else { ctx.lineTo(px, py); }
                    }
                }
                ctx.stroke();
            }
        }

        // ==========================================
        // 3. UPDATE DOM UI (Indikator, Teks, Overlay)
        // ==========================================
        let indY1 = Math.max(40, Math.min(200, 120 - yPx1)); 
        let indY2 = Math.max(40, Math.min(200, 120 - yPx2)); 
        let indX = Math.max(30, Math.min(230, 130 + xPixelOffset));
        let trigScaleMax = vDivScale[(realComp.trigSource === 0 ? realComp.ch1 : realComp.ch2).vDivIndex] * 4;
        let trigYPx = (realComp.trigSource === 0 ? realComp.ch1 : realComp.ch2).yPosition * 20;
        let indLvlY = Math.max(40, Math.min(200, 120 - ((realComp.trigLevel / trigScaleMax) * 80) - trigYPx));
        let tPerDiv = tDivScale[realComp.tDivIndex];

        // Pisahkan DOM update ke frame animasi mandiri agar tidak memberatkan physics loop
        requestAnimationFrame(() => {
            let yInd1 = contentDiv.querySelector('.ypos-ind-1'); 
            if (yInd1) { yInd1.setAttribute('points', `230,${indY1} 235,${indY1-4} 235,${indY1+4}`); yInd1.style.display = realComp.ch1.enabled ? 'block' : 'none'; }
            let yInd2 = contentDiv.querySelector('.ypos-ind-2'); 
            if (yInd2) { yInd2.setAttribute('points', `230,${indY2} 235,${indY2-4} 235,${indY2+4}`); yInd2.style.display = realComp.ch2.enabled ? 'block' : 'none'; }
            
            let xInd = contentDiv.querySelector('.xpos-indicator'); 
            if (xInd) xInd.setAttribute('points', `${indX},40 ${indX-4},35 ${indX+4},35`);
            let lvlInd = contentDiv.querySelector('.lvl-indicator'); 
            if (lvlInd) lvlInd.setAttribute('points', `230,${indLvlY} 225,${indLvlY-4} 225,${indLvlY+4}`);
                           
            // KURSOR PENGUKURAN (SMART OSD)
            let cursGroup = contentDiv.querySelector('.cursors-group');
            let cursOSD = contentDiv.querySelector('.cur-osd');
            let cursBtnTxt = contentDiv.querySelector('.cursor-txt');
            
            if (realComp.cursorActive) {
                if (cursGroup) cursGroup.style.display = 'block';
                if (cursOSD) cursOSD.style.display = 'block';
                if (cursBtnTxt) { cursBtnTxt.textContent = 'ON'; cursBtnTxt.setAttribute('fill', '#10b981'); }
                
                let curMode = realComp.lastCursorMode || 'V'; 
                let title = contentDiv.querySelector('.cur-title');
                let txt1 = contentDiv.querySelector('.cur-txt-1');
                let txt2 = contentDiv.querySelector('.cur-txt-2');
                let txtD = contentDiv.querySelector('.cur-txt-d');
                
                if (curMode === 'V') {
                    let activeChInfo = realComp.activeCh === 1 ? realComp.ch1 : realComp.ch2;
                    let scaleMax = vDivScale[activeChInfo.vDivIndex] * 4;
                    let yPx = activeChInfo.yPosition * 20;
                    
                    let val1 = (120 - realComp.curV1Y - yPx) * scaleMax / 80;
                    let val2 = (120 - realComp.curV2Y - yPx) * scaleMax / 80;
                    let deltaV = val1 - val2;
                    
                    if(title) { title.textContent = `CURS (CH${realComp.activeCh} VOLT)`; title.setAttribute('fill', realComp.activeCh === 1 ? '#eab308' : '#06b6d4'); }
                    if(txt1) { txt1.textContent = `1: ${val1.toFixed(2)}V`; txt1.setAttribute('fill', '#eab308'); }
                    if(txt2) { txt2.textContent = `2: ${val2.toFixed(2)}V`; txt2.setAttribute('fill', '#06b6d4'); }
                    if(txtD) { txtD.textContent = `Δ: ${Math.abs(deltaV).toFixed(2)}V`; }
                } else {
                    let t1 = ((realComp.curT1X - 30) / 20) * tPerDiv;
                    let t2 = ((realComp.curT2X - 30) / 20) * tPerDiv;
                    let deltaT = Math.abs(t2 - t1);
                    let freq = deltaT > 0 ? (1 / deltaT) : 0;
                    
                    const fmtT = (t) => (t >= 1 ? t.toFixed(2)+'s' : t >= 0.001 ? (t*1000).toFixed(2)+'ms' : (t*1e6).toFixed(2)+'μs');
                    const fmtF = (f) => (f >= 1e6 ? (f/1e6).toFixed(2)+'MHz' : f >= 1e3 ? (f/1e3).toFixed(2)+'kHz' : f.toFixed(2)+'Hz');

                    if(title) { title.textContent = `CURSOR (TIME)`; title.setAttribute('fill', '#fff'); }
                    if(txt1) { txt1.textContent = `1: ${fmtT(t1)}`; txt1.setAttribute('fill', '#eab308'); }
                    if(txt2) { txt2.textContent = `2: ${fmtT(t2)}`; txt2.setAttribute('fill', '#06b6d4'); }
                    if(txtD) { txtD.textContent = `Δ: ${fmtT(deltaT)} (${fmtF(freq)})`; }
                }
            } else {
                if (cursGroup) cursGroup.style.display = 'none';
                if (cursOSD) cursOSD.style.display = 'none';
                if (cursBtnTxt) { cursBtnTxt.textContent = 'OFF'; cursBtnTxt.setAttribute('fill', '#fff'); }
            }

            // AUTO MEASUREMENT
            let measOverlay = contentDiv.querySelector('.meas-overlay');
            if (measOverlay) {
                if (realComp.measActive) {
                    measOverlay.style.display = 'block';
                    const screenW = 200; 
                    let activeHist = new Array(screenW);
                    let targetBuf = realComp.activeCh === 1 ? realComp.dispBuf1 : realComp.dispBuf2;
                    
                    for(let i = 0; i < screenW; i++) {
                        let offsetFromRight = i - (screenW - 1); 
                        let exactIdx = anchorIdx + (offsetFromRight * tScaleRatio);
                        let idx = Math.max(0, Math.min(2999, Math.floor(exactIdx)));
                        activeHist[i] = targetBuf[idx];
                    }

                    let invMult = (realComp.activeCh === 1 ? realComp.ch1.invert : realComp.ch2.invert) ? -1 : 1;
                    
                    let vMax = -Infinity, vMin = Infinity, sum = 0, sumSq = 0;
                    for(let i=0; i < screenW; i++) {
                        let v = activeHist[i] * invMult;
                        if (v > vMax) vMax = v;
                        if (v < vMin) vMin = v;
                        sum += v; sumSq += (v * v);
                    }
                    if (vMax === -Infinity) { vMax = 0; vMin = 0; }
                    
                    let vAvg = sum / screenW;                    
                    let vRms = Math.sqrt(sumSq / screenW);       
                    let vPp = vMax - vMin;                   
                    let vAmp = vPp / 2;                      
                    
                    let timePerPoint = (tPerDiv * 10) / screenW; 
                    let midV = (vMax + vMin) / 2;
                    let p10 = vMin + (vPp * 0.1); 
                    let p90 = vMin + (vPp * 0.9); 
                    
                    let edges = [];
                    if (vPp > 0.1) {
                        let isH = (activeHist[0] * invMult) > midV;
                        for(let i = 1; i < screenW; i++) {
                            let v = activeHist[i] * invMult;
                            let currentH = v > midV;
                            if (currentH !== isH) {
                                edges.push({ type: currentH ? 'rise' : 'fall', idx: i });
                                isH = currentH;
                            }
                        }
                    }
                    
                    let validPeriods = [], validPWs = [];
                    for(let i=0; i<edges.length; i++) {
                        if (edges[i].type === 'rise') {
                            let nextFall = edges.find((e, idx) => idx > i && e.type === 'fall');
                            if (nextFall) validPWs.push(nextFall.idx - edges[i].idx); 
                            let nextRise = edges.find((e, idx) => idx > i && e.type === 'rise');
                            if (nextRise) validPeriods.push(nextRise.idx - edges[i].idx); 
                        }
                    }
                    
                    let freq = 0, period = 0, pulseWidth = 0, dutyCycle = 0;
                    if (validPeriods.length > 0) {
                        let avgPeriodPoints = validPeriods.reduce((a,b)=>a+b) / validPeriods.length;
                        period = avgPeriodPoints * timePerPoint;
                        freq = 1 / period;
                    }
                    if (validPWs.length > 0 && period > 0) {
                        let avgPWPoints = validPWs.reduce((a,b)=>a+b) / validPWs.length;
                        pulseWidth = avgPWPoints * timePerPoint;
                        dutyCycle = (pulseWidth / period) * 100;
                    }
                    
                    let riseTimePts = 0, fallTimePts = 0;
                    if (vPp > 0.1) {
                        let firstRise = edges.find(e => e.type === 'rise');
                        if (firstRise) {
                            let s10 = firstRise.idx, e90 = firstRise.idx;
                            while(s10 > 0 && (activeHist[s10] * invMult) > p10) s10--;
                            while(e90 < (screenW - 1) && (activeHist[e90] * invMult) < p90) e90++;
                            riseTimePts = Math.max(0, e90 - s10);
                        }
                        let firstFall = edges.find(e => e.type === 'fall');
                        if (firstFall) {
                            let s90 = firstFall.idx, e10 = firstFall.idx;
                            while(s90 > 0 && (activeHist[s90] * invMult) < p90) s90--;
                            while(e10 < (screenW - 1) && (activeHist[e10] * invMult) > p10) e10++;
                            fallTimePts = Math.max(0, e10 - s90);
                        }
                    }

                    const fmtF = (f) => (f > 0 && isFinite(f)) ? (f >= 1e6 ? (f/1e6).toFixed(2)+'MHz' : f >= 1e3 ? (f/1e3).toFixed(2)+'kHz' : f.toFixed(2)+'Hz') : '---';
                    const fmtT = (t) => (t > 0 && isFinite(t)) ? (t >= 1 ? t.toFixed(2)+'s' : t >= 0.001 ? (t*1000).toFixed(2)+'ms' : (t*1e6).toFixed(2)+'μs') : '---';
                    
                    let title = contentDiv.querySelector('.meas-title');
                    if (title) {
                        title.textContent = `MEASURE CH${realComp.activeCh}`;
                        title.setAttribute('fill', realComp.activeCh === 1 ? '#eab308' : '#06b6d4');
                    }
                    contentDiv.querySelector('.m-vpp').textContent = vPp.toFixed(2) + 'V';
                    contentDiv.querySelector('.m-vmax').textContent = vMax.toFixed(2) + 'V';
                    contentDiv.querySelector('.m-vmin').textContent = vMin.toFixed(2) + 'V';
                    contentDiv.querySelector('.m-vamp').textContent = vAmp.toFixed(2) + 'V';
                    contentDiv.querySelector('.m-vrms').textContent = vRms.toFixed(2) + 'V';
                    contentDiv.querySelector('.m-vavg').textContent = vAvg.toFixed(2) + 'V';
                    contentDiv.querySelector('.m-freq').textContent = fmtF(freq);
                    contentDiv.querySelector('.m-per').textContent = fmtT(period);
                    contentDiv.querySelector('.m-duty').textContent = (dutyCycle > 0 && isFinite(dutyCycle)) ? dutyCycle.toFixed(1)+'%' : '---';
                    contentDiv.querySelector('.m-pw').textContent = fmtT(pulseWidth);
                    contentDiv.querySelector('.m-rise').textContent = fmtT(riseTimePts * timePerPoint);
                    contentDiv.querySelector('.m-fall').textContent = fmtT(fallTimePts * timePerPoint);
                } else {
                    measOverlay.style.display = 'none'; 
                }
            }
            
            // Perbarui Teks Label Tombol
            let measTxt = contentDiv.querySelector('.meas-txt');
            if (measTxt) { measTxt.textContent = realComp.measActive ? 'ON' : 'OFF'; measTxt.setAttribute('fill', realComp.measActive ? '#10b981' : '#fff'); }

            let dispTxt = contentDiv.querySelector('.disp-mode-txt');
            if (dispTxt) {
                dispTxt.textContent = ['Y-T', 'X-Y', 'ROLL'][realComp.dispMode];
                dispTxt.setAttribute('fill', realComp.dispMode === 1 ? '#10b981' : (realComp.dispMode === 2 ? '#f59e0b' : '#fff'));
            }
            
            contentDiv.querySelector('.ch-coupl-txt').textContent = ['DC', 'AC', 'GND'][(realComp.activeCh === 1 ? realComp.ch1 : realComp.ch2).coupl];
            contentDiv.querySelector('.btn-invert').setAttribute('fill', (realComp.activeCh === 1 ? realComp.ch1 : realComp.ch2).invert ? (realComp.activeCh === 1 ? '#eab308' : '#06b6d4') : '#475569');
            contentDiv.querySelector('.inv-text').setAttribute('fill', (realComp.activeCh === 1 ? realComp.ch1 : realComp.ch2).invert ? '#000' : '#fff');
            
            let tmTxt = contentDiv.querySelector('.trig-mode-txt');
            if (tmTxt) {
                if (realComp.dispMode === 2 || realComp.dispMode === 1) {
                    tmTxt.textContent = '---'; tmTxt.setAttribute('fill', '#475569');
                } else {
                    tmTxt.textContent = ['AUTO', 'NORM', 'SING'][realComp.trigMode];
                    if (realComp.trigMode === 2 && realComp.trigState === 'STOP') { tmTxt.textContent = 'STOP'; tmTxt.setAttribute('fill', '#f87171'); } 
                    else if (realComp.trigMode === 2 && realComp.trigState === 'WAIT') { tmTxt.textContent = 'RDY'; tmTxt.setAttribute('fill', '#fbbf24'); } 
                    else if (realComp.trigMode !== 0 && realComp.trigState === 'WAIT') { tmTxt.setAttribute('fill', '#fbbf24'); } 
                    else { tmTxt.setAttribute('fill', '#fff'); }
                }
            }
            
            contentDiv.querySelector('.trig-slope-txt').textContent = realComp.trigSlope === 0 ? 'RISE ↑' : 'FALL ↓';
            contentDiv.querySelector('.trig-coupl-txt').textContent = ['DC', 'AC', 'HF-R', 'LF-R'][realComp.trigCoupl];
            contentDiv.querySelector('.trig-src-txt').textContent = ['CH1', 'CH2'][realComp.trigSource];
            contentDiv.querySelector('.tlvl-text').textContent = `Trig: ${realComp.trigLevel.toFixed(1)}V`;
            
            let vdiv1Txt = contentDiv.querySelector('.vdiv1-text');
            if (vdiv1Txt) { vdiv1Txt.textContent = `${realComp.dispMode === 1 ? 'X (CH1)' : 'CH1'}: ${vDivScale[realComp.ch1.vDivIndex] < 1 ? (vDivScale[realComp.ch1.vDivIndex]*1000)+'mV/div' : vDivScale[realComp.ch1.vDivIndex]+'V/div'}`; vdiv1Txt.setAttribute('fill', realComp.ch1.enabled ? '#eab308' : '#475569'); }
            
            let vdiv2Txt = contentDiv.querySelector('.vdiv2-text');
            if (vdiv2Txt) { vdiv2Txt.textContent = `${realComp.dispMode === 1 ? 'Y (CH2)' : 'CH2'}: ${vDivScale[realComp.ch2.vDivIndex] < 1 ? (vDivScale[realComp.ch2.vDivIndex]*1000)+'mV/div' : vDivScale[realComp.ch2.vDivIndex]+'V/div'}`; vdiv2Txt.setAttribute('fill', realComp.ch2.enabled ? '#06b6d4' : '#475569'); }
            
            let tdivTxt = contentDiv.querySelector('.tdiv-text');
            if (tdivTxt) tdivTxt.textContent = `T/Div: ${tPerDiv >= 1 ? tPerDiv + "s/div" : (tPerDiv >= 0.001 ? (tPerDiv * 1000) + "ms/div" : (tPerDiv * 1000000) + "μs/div")}`;
            
            let val1Txt = contentDiv.querySelector('.val1-text');
            if (val1Txt) { val1Txt.textContent = realComp.ch1.enabled ? `V1: ${((realComp.simV || 0) * (realComp.ch1.invert ? -1 : 1)).toFixed(2)}V` : 'V1: OFF'; val1Txt.setAttribute('fill', realComp.ch1.enabled ? '#eab308' : '#475569'); }
            
            let val2Txt = contentDiv.querySelector('.val2-text');
            if (val2Txt) { val2Txt.textContent = realComp.ch2.enabled ? `V2: ${((realComp.simV2 || 0) * (realComp.ch2.invert ? -1 : 1)).toFixed(2)}V` : 'V2: OFF'; val2Txt.setAttribute('fill', realComp.ch2.enabled ? '#06b6d4' : '#475569'); }
            
            let chEnTxt = contentDiv.querySelector('.ch-en-text');
            if (chEnTxt) { chEnTxt.textContent = (realComp.activeCh === 1 ? realComp.ch1 : realComp.ch2).enabled !== false ? 'ON' : 'OFF'; chEnTxt.setAttribute('fill', (realComp.activeCh === 1 ? realComp.ch1 : realComp.ch2).enabled ? '#10b981' : '#f87171'); }
            
            this.setPinActive('pin-in-0', (realComp.simV || 0) > 0); 
            this.setPinActive('pin-in-1', (realComp.simV2 || 0) > 0);
        });
    }
}
UIRegistry['oscilloscope'] = OscilloscopeUI;

// =========================================================
// 3. IMPLEMENTASI KELAS KOMPONEN (BAGIAN FINAL: SEMIKONDUKTOR & IC)
// =========================================================

// -----------------------------------------------------
// KELOMPOK TRANSISTOR & TRAFO
// -----------------------------------------------------
class TransistorUI extends BaseUIComponent {
    static getDimensions() { return [80, 80]; } // MOSFET di-override via style nanti
    getSVG() {
        const isNPN = this.compData.type === 'bjt_npn';
        const isPNP = this.compData.type === 'bjt_pnp';
        if (isNPN || isPNP) {
            const poly = isNPN ? `<polygon points="34,50 40,60 28,58" fill="#1e293b"/>` : `<polygon points="35,52 25,48 30,59" fill="#1e293b"/>`;
            return `<svg width="80" height="80" viewBox="0 0 80 80">
              <circle class="anim-body" cx="40" cy="40" r="24" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
              <line class="pin-in-0" x1="0" y1="40" x2="25" y2="40" stroke="#006600" stroke-width="3"/>
              <line x1="25" y1="25" x2="25" y2="55" stroke="#1e293b" stroke-width="3"/>
              <line class="pin-out-0" x1="25" y1="32" x2="40" y2="20" stroke="#006600" stroke-width="3"/>
              <line x1="40" y1="20" x2="40" y2="0" stroke="#006600" stroke-width="3"/>
              <line class="pin-in-1" x1="25" y1="48" x2="40" y2="60" stroke="#006600" stroke-width="3"/>
              <line x1="40" y1="60" x2="40" y2="80" stroke="#006600" stroke-width="3"/>
              ${poly}
              <text x="10" y="35" class="comp-label" font-weight="bold" font-size="12">B</text>
              <text x="46" y="14" class="comp-label" font-weight="bold" font-size="12">C</text>
              <text x="46" y="76" class="comp-label" font-weight="bold" font-size="12">E</text>
            </svg>`;
        } else {
            const isN = this.compData.type === 'mosfet_n';
            const poly = isN ? `<polygon points="46,46 38,50 46,54" fill="#1e293b"/>` : `<polygon points="42,46 50,50 42,54" fill="#1e293b"/>`;
            this.mainDiv.style.width = '100px'; this.mainDiv.style.height = '100px'; // Override MOSFET
            return `<svg width="100" height="100" viewBox="0 0 100 100">
              <circle class="anim-body" cx="50" cy="50" r="32" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
              <line class="pin-in-0" x1="0" y1="50" x2="30" y2="50" stroke="#006600" stroke-width="3"/>
              <line x1="30" y1="30" x2="30" y2="70" stroke="#1e293b" stroke-width="3"/>
              <line x1="38" y1="28" x2="38" y2="42" stroke="#1e293b" stroke-width="3"/>
              <line x1="38" y1="46" x2="38" y2="54" stroke="#1e293b" stroke-width="3"/>
              <line x1="38" y1="58" x2="38" y2="72" stroke="#1e293b" stroke-width="3"/>
              <line class="pin-in-1" x1="50" y1="0" x2="50" y2="35" stroke="#006600" stroke-width="3"/>
              <line class="pin-out-0" x1="50" y1="35" x2="38" y2="35" stroke="#006600" stroke-width="3"/>
              <line class="pin-out-1" x1="50" y1="100" x2="50" y2="65" stroke="#006600" stroke-width="3"/>
              <line class="pin-out-2" x1="50" y1="65" x2="38" y2="65" stroke="#006600" stroke-width="3"/>
              <line x1="38" y1="50" x2="50" y2="50" stroke="#1e293b" stroke-width="3"/>
              <line x1="50" y1="50" x2="50" y2="65" stroke="#1e293b" stroke-width="3"/>
              ${poly}
              <text x="14" y="45" class="comp-label" font-weight="bold" font-size="14">G</text>
              <text x="56" y="20" class="comp-label" font-weight="bold" font-size="14">D</text>
              <text x="56" y="90" class="comp-label" font-weight="bold" font-size="14">S</text>
            </svg>`;
        }
    }
    updateState() {
        const isActive = this.compData.state === '1';
        let isControlHigh = (this.compData.type === 'bjt_npn' || this.compData.type === 'mosfet_n') ? isActive : false;
        this.setPinActive('pin-in-0', isControlHigh);
        this.setPinActive('pin-in-1', this.compData.simV > 0); 
        this.setPinActive('pin-out-0', isActive && this.compData.simV > 0);
        if (this.compData.type.startsWith('mosfet')) { 
            this.setPinActive('pin-out-1', isActive && this.compData.simV > 0); 
            this.setPinActive('pin-out-2', isActive && this.compData.simV > 0); 
        }
        const body = this.contentDiv.querySelector('.anim-body');
        if (body) body.setAttribute('fill', isActive ? '#dcfce7' : '#e8e6d3');
    }
}
['bjt_npn', 'bjt_pnp', 'mosfet_n', 'mosfet_p'].forEach(t => UIRegistry[t] = TransistorUI);

class TransformerUI extends BaseUIComponent {
    static getDimensions() { return [100, 100]; }
    getSVG() {
        return `<svg width="100" height="100" viewBox="0 0 100 100"><line x1="46" y1="15" x2="46" y2="85" stroke="#1e293b" stroke-width="3"/><line x1="54" y1="15" x2="54" y2="85" stroke="#1e293b" stroke-width="3"/><line x1="0" y1="30" x2="30" y2="30" stroke="#006600" stroke-width="2" class="pin-in-0"/><line x1="0" y1="70" x2="30" y2="70" stroke="#006600" stroke-width="2" class="pin-in-1"/><path class="anim-coil-p" d="M 30 30 C 45 30 45 40 30 40 C 45 40 45 50 30 50 C 45 50 45 60 30 60 C 45 60 45 70 30 70" fill="none" stroke="#1e293b" stroke-width="3"/><line x1="70" y1="20" x2="100" y2="20" stroke="#006600" stroke-width="2" class="pin-out-0"/><line x1="70" y1="50" x2="100" y2="50" stroke="#006600" stroke-width="2" class="pin-out-1"/><line x1="70" y1="80" x2="100" y2="80" stroke="#006600" stroke-width="2" class="pin-out-2"/><path class="anim-coil-s" d="M 70 20 C 55 20 55 35 70 35 C 55 35 55 50 70 50 C 55 50 55 65 70 65 C 55 65 55 80 70 80" fill="none" stroke="#1e293b" stroke-width="3"/></svg>`;
    }
    updateState() {
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); this.setPinActive('pin-in-1', vState); 
        this.setPinActive('pin-out-0', vState); this.setPinActive('pin-out-1', vState); this.setPinActive('pin-out-2', vState);
        const coilP = this.contentDiv.querySelector('.anim-coil-p');
        if (coilP) coilP.setAttribute('stroke', vState ? '#eab308' : '#1e293b');
    }
}
UIRegistry['transformer'] = TransformerUI;

class Transformer2P2SUI extends BaseUIComponent {
    static getDimensions() { return [100, 100]; }
    getSVG() {
        return `<svg width="100" height="100" viewBox="0 0 100 100">
          <!-- Inti Besi Trafo -->
          <line x1="46" y1="15" x2="46" y2="85" stroke="#1e293b" stroke-width="3"/>
          <line x1="54" y1="15" x2="54" y2="85" stroke="#1e293b" stroke-width="3"/>
          
          <!-- Kaki Primer (Kiri) -->
          <line x1="0" y1="30" x2="30" y2="30" stroke="#006600" stroke-width="2" class="pin-in-0"/>
          <line x1="0" y1="70" x2="30" y2="70" stroke="#006600" stroke-width="2" class="pin-in-1"/>
          
          <!-- Koil Primer -->
          <path class="anim-coil-p" d="M 30 30 C 45 30 45 40 30 40 C 45 40 45 50 30 50 C 45 50 45 60 30 60 C 45 60 45 70 30 70" fill="none" stroke="#1e293b" stroke-width="3"/>
          
          <!-- Kaki Sekunder (Kanan) - Hanya ada Atas dan Bawah -->
          <line x1="70" y1="30" x2="100" y2="30" stroke="#006600" stroke-width="2" class="pin-out-0"/>
          <line x1="70" y1="70" x2="100" y2="70" stroke="#006600" stroke-width="2" class="pin-out-1"/>
          
          <!-- Koil Sekunder -->
          <path class="anim-coil-s" d="M 70 30 C 55 30 55 40 70 40 C 55 40 55 50 70 50 C 55 50 55 60 70 60 C 55 60 55 70 70 70" fill="none" stroke="#1e293b" stroke-width="3"/>
        </svg>`;
    }
    updateState() {
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-in-1', vState); 
        this.setPinActive('pin-out-0', vState); 
        this.setPinActive('pin-out-1', vState);
        const coilP = this.contentDiv.querySelector('.anim-coil-p');
        if (coilP) coilP.setAttribute('stroke', vState ? '#eab308' : '#1e293b');
    }
}
// Daftarkan komponen ke mesin UI
UIRegistry['transformer_2p2s'] = Transformer2P2SUI;

// -----------------------------------------------------
// KELOMPOK DIODA, lampu, LED & TAMPILAN
// -----------------------------------------------------
class DiodeUI extends BaseUIComponent {
    static getDimensions() { return [60, 40]; }
    getSVG() {
        return `<svg width="60" height="40" viewBox="0 0 60 40"><line class="pin-in-0" x1="0" y1="20" x2="20" y2="20" stroke="#006600" stroke-width="3"/><line class="pin-out-0" x1="35" y1="20" x2="60" y2="20" stroke="#006600" stroke-width="3"/><polygon class="anim-body" points="20,10 20,30 35,20" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/><line class="anim-line" x1="35" y1="10" x2="35" y2="30" stroke="#1e293b" stroke-width="2"/><text x="30" y="38" class="comp-label" text-anchor="middle">D${this.id}</text></svg>`;
    }
    updateState() {
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); this.setPinActive('pin-out-0', vState);
    }
}
UIRegistry['diode'] = DiodeUI;

class DiodeBridgeUI extends BaseUIComponent {
    static getDimensions() { return [140, 140]; }
    getSVG() {
        const diodeSym = (cx, cy, a) => `<g transform="translate(${cx},${cy}) rotate(${a})"><line x1="-12" y1="0" x2="-4" y2="0" stroke="#1e293b" stroke-width="2"/><polygon points="-4,-6 -4,6 5,0" fill="#1e293b"/><line x1="5" y1="-7" x2="5" y2="7" stroke="#1e293b" stroke-width="2.5"/><line x1="5" y1="0" x2="12" y2="0" stroke="#1e293b" stroke-width="2"/></g>`;
        return `<svg width="140" height="140" viewBox="0 0 140 140">
          <line class="pin-in-0" x1="70" y1="15" x2="70" y2="0" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-1" x1="70" y1="125" x2="70" y2="140" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="125" y1="70" x2="140" y2="70" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-1" x1="15" y1="70" x2="0" y2="70" stroke="#006600" stroke-width="3"/>
          <line x1="70" y1="15" x2="125" y2="70" stroke="#1e293b" stroke-width="2"/>
          <line x1="15" y1="70" x2="70" y2="15" stroke="#1e293b" stroke-width="2"/>
          <line x1="70" y1="125" x2="125" y2="70" stroke="#1e293b" stroke-width="2"/>
          <line x1="15" y1="70" x2="70" y2="125" stroke="#1e293b" stroke-width="2"/>
          ${diodeSym(97.5, 42.5, 45)}${diodeSym(42.5, 42.5, -45)}${diodeSym(97.5, 97.5, -45)}${diodeSym(42.5, 97.5, 45)}
          <circle cx="70" cy="15" r="3" fill="#1e293b"/><circle cx="125" cy="70" r="3" fill="#1e293b"/>
          <circle cx="70" cy="125" r="3" fill="#1e293b"/><circle cx="15" cy="70" r="3" fill="#1e293b"/>
          <text x="60" y="9" text-anchor="middle" font-size="13" fill="#1e293b">~</text>
          <text x="60" y="137" text-anchor="middle" font-size="13" fill="#1e293b">~</text>
          <text x="132" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="red">+</text>
          <text x="8" y="65" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">-</text>
        </svg>`;
    }
    updateState() {
        this.setPinActive('pin-in-0', this.compData.simV > 0); this.setPinActive('pin-in-1', this.compData.simV > 0);
        this.setPinActive('pin-out-0', this.compData.simV > 1.5); this.setPinActive('pin-out-1', this.compData.simV > 1.5);
    }
}
UIRegistry['diode_bridge'] = DiodeBridgeUI;

class LampUI extends BaseUIComponent {
    static getDimensions() { return [60, 60]; } // Ukuran kanvas komponen 60x60 pixel
    
    getSVG() {
        return `<svg width="60" height="60" viewBox="0 0 60 60" class="anim-svg">
          <!-- Pin Konektor Kiri dan Kanan -->
          <line class="pin-in-0" x1="0" y1="30" x2="20" y2="30" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="40" y1="30" x2="60" y2="30" stroke="#006600" stroke-width="3"/>
          
          <!-- Kaca Bohlam Lampu -->
          <circle cx="30" cy="25" r="14" fill="rgba(255, 255, 255, 0.1)" stroke="#1e293b" stroke-width="2"/>
          <path d="M 23 37 L 23 42 L 37 42 L 37 37" fill="#64748b" stroke="#1e293b" stroke-width="2"/>
          
          <!-- Tiang Penyangga Filamen dalam Bohlam -->
          <line x1="26" y1="37" x2="26" y2="25" stroke="#1e293b" stroke-width="1.5"/>
          <line x1="34" y1="37" x2="34" y2="25" stroke="#1e293b" stroke-width="1.5"/>
          
          <!-- Filamen Tungsten (Melengkung) -->
          <path class="anim-filament" d="M 26 25 Q 30 18 34 25" fill="none" stroke="#94a3b8" stroke-width="1.5"/>
          
          <!-- Efek Kecerahan Cahaya (Glow) - Tersembunyi di awal (opacity=0) -->
          <circle class="anim-glow" cx="30" cy="25" r="22" fill="#facc15" opacity="0" style="mix-blend-mode: screen; filter: blur(5px); pointer-events: none; transition: opacity 0.1s ease;"/>
          
          <!-- Teks Label Rating Tegangan -->
          <text class="anim-text val-trigger" x="30" y="60" text-anchor="middle" font-size="10" font-weight="bold" fill="#4f46e5" style="cursor:pointer; pointer-events:auto;"></text>
        </svg>`;
    }
    
    updateState(isSimActive) {
        // Mewarnai pin kabel jadi hijau jika ada tegangan
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', vState);

        const isBlown = this.compData.state === 'blown'; // Cek apakah lampu putus
        const filament = this.contentDiv.querySelector('.anim-filament');
        const glow = this.contentDiv.querySelector('.anim-glow');
        const text = this.contentDiv.querySelector('.anim-text');

        // Tampilkan teks Rated Voltage (Default 12V)
        const ratedV = this.compData.ratedV !== undefined ? parseFloat(this.compData.ratedV) : 12.0;
        if (text) {
            text.textContent = ratedV + 'V';
            text.setAttribute('fill', isBlown ? '#ef4444' : '#4f46e5'); // Merah jika putus
        }

        if (isBlown) {
            // Animasi Jika Lampu Putus/Meledak
            if (glow) glow.style.opacity = '0';
            if (filament) {
                filament.setAttribute('stroke', '#000000'); // Filamen hangus hitam
                filament.setAttribute('stroke-dasharray', '2,2'); // Efek filamen terputus
            }
        } else {
            // Animasi Jika Lampu Normal
            if (filament) filament.removeAttribute('stroke-dasharray');
            
            const simV = Math.abs(this.compData.simV || 0);
            
            // Rumus Fisika Kecerahan: Kecerahan berbanding lurus dengan daya (V^2 / R)
            // Jadi perbandingannya adalah (Tegangan Masuk / Tegangan Rating)^2
            let brightness = Math.pow(simV / ratedV, 2);
            
            // Batasi glow maksimal hingga 1.5 (150%) agar layar tidak terlalu silau
            if (brightness > 1.5) brightness = 1.5;
            // Jika tegangan terlalu kecil, anggap mati
            if (brightness < 0.05) brightness = 0;

            if (glow) glow.style.opacity = brightness.toFixed(2);
            if (filament) {
                // Ubah warna filamen dari abu-abu menjadi kuning pijar jika menyala
                filament.setAttribute('stroke', brightness > 0.05 ? '#fef08a' : '#94a3b8');
            }
        }
    }
}
UIRegistry['lamp'] = LampUI;

class LedUI extends BaseUIComponent {
    static getDimensions() { return [60, 60]; }
    getSVG() {
        return `<svg width="60" height="60" viewBox="0 0 60 60" class="anim-svg">
          <line class="pin-in-0" x1="0" y1="30" x2="15" y2="30" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="45" y1="30" x2="60" y2="30" stroke="#006600" stroke-width="3"/>
          <circle class="anim-body" cx="30" cy="30" r="15" fill="#4a0000" stroke="#1e293b" stroke-width="2"/>
          <path d="M25 25 L35 30 L25 35 Z" fill="#1e293b"/>
          <line x1="35" y1="23" x2="35" y2="37" stroke="#1e293b" stroke-width="3"/>
          <g class="warning-icon" style="display:none; pointer-events:none;">
              <polygon points="18,45 24,55 12,55" fill="#facc15" stroke="#ca8a04" stroke-width="1.5" stroke-linejoin="round"/>
              <text x="18" y="53" font-size="8" font-weight="900" fill="#000" text-anchor="middle">!</text>
          </g>
          <text x="30" y="55" class="anim-text comp-label val-trigger" text-anchor="middle" fill="#4f46e5" style="cursor:pointer; pointer-events:auto; font-weight:bold;">L${this.id}</text>
        </svg>`;
    }
    updateState() {
        const current = Math.abs(this.compData.simI || 0); 
        const fullDriveAmpere = (parseFloat(this.compData.fullDriveI) || 10) / 1000; 
        this.setPinActive('pin-in-0', this.compData.simV > 0); 
        this.setPinActive('pin-out-0', current > 0.001);
        
        const body = this.contentDiv.querySelector('.anim-body'); 
        const svg = this.contentDiv.querySelector('.anim-svg');
        const txt = this.contentDiv.querySelector('.anim-text');
        const warningIcon = this.contentDiv.querySelector('.warning-icon');
        
        if (this.compData.isOvercurrent) {
            if (body) { body.setAttribute('fill', '#262626'); body.setAttribute('stroke', '#ef4444'); }
            if (svg) { svg.style.filter = 'none'; svg.style.opacity = 1; }
            if (warningIcon) warningIcon.style.display = 'block'; 
            if (txt) { txt.setAttribute('fill', '#ef4444'); txt.setAttribute('x', '36'); }
        } else {
            if (warningIcon) warningIcon.style.display = 'none'; 
            let intensity = Math.min(1, current / fullDriveAmpere);
            const isOn = intensity > 0.005; 
            
            const ledColor = this.compData.color || 'red';
            let r=0, g=0, b=0, glowRGB='255, 0, 0', baseFill='#380000';

            if (ledColor === 'red') { r = Math.round(56 + (intensity * 199)); g = b = Math.round(intensity * 40); } 
            else if (ledColor === 'green') { g = Math.round(56 + (intensity * 199)); r = b = Math.round(intensity * 40); baseFill = '#003800'; glowRGB = '0, 255, 0'; } 
            else if (ledColor === 'blue') { b = Math.round(56 + (intensity * 199)); r = g = Math.round(intensity * 40); baseFill = '#000038'; glowRGB = '0, 100, 255'; } 
            else if (ledColor === 'yellow') { r = g = Math.round(56 + (intensity * 199)); b = Math.round(intensity * 40); baseFill = '#383800'; glowRGB = '255, 255, 0'; }
            
            if (body) { body.setAttribute('fill', isOn ? `rgb(${r}, ${g}, ${b})` : baseFill); body.setAttribute('stroke', '#1e293b'); }
            if (svg) {
              if (isOn) {
                const blur = 2 + (intensity * 18); const glowAlpha = 0.1 + (intensity * 0.9); 
                svg.style.filter = `drop-shadow(0 0 ${blur}px rgba(${glowRGB}, ${glowAlpha}))`;
                svg.style.opacity = 1 + (intensity * 0.5); 
              } else {
                svg.style.filter = 'none'; svg.style.opacity = 1; 
              }
            }
            if (txt) { txt.setAttribute('fill', '#4f46e5'); txt.setAttribute('x', '30'); }
        }
        if (txt) txt.textContent = `L${this.id}`;
    }
}
UIRegistry['led'] = LedUI;

class SevenSegmentUI extends BaseUIComponent {
    static getDimensions() { return [160, 160]; }
    getSVG() {
        return `<svg width="160" height="160" viewBox="0 0 160 160">
          <rect class="anim-body" x="20" y="5" width="110" height="150" rx="4" fill="#18181b" stroke="#1e293b" stroke-width="2"/>
          <line class="pin-in-0" x1="0" y1="20" x2="20" y2="20" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-1" x1="0" y1="40" x2="20" y2="40" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-2" x1="0" y1="60" x2="20" y2="60" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-3" x1="0" y1="80" x2="20" y2="80" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-4" x1="0" y1="100" x2="20" y2="100" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-5" x1="0" y1="120" x2="20" y2="120" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-6" x1="0" y1="140" x2="20" y2="140" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="130" y1="140" x2="150" y2="140" stroke="#006600" stroke-width="3"/>
          <text x="28" y="24" font-size="10" font-weight="bold" fill="#94a3b8">a</text><text x="28" y="44" font-size="10" font-weight="bold" fill="#94a3b8">b</text>
          <text x="28" y="64" font-size="10" font-weight="bold" fill="#94a3b8">c</text><text x="28" y="84" font-size="10" font-weight="bold" fill="#94a3b8">d</text>
          <text x="28" y="104" font-size="10" font-weight="bold" fill="#94a3b8">e</text><text x="28" y="124" font-size="10" font-weight="bold" fill="#94a3b8">f</text>
          <text x="28" y="144" font-size="10" font-weight="bold" fill="#94a3b8">g</text><text x="125" y="144" font-size="9" font-weight="bold" fill="#ef4444" text-anchor="end">COM</text>
          <g transform="translate(45, 26) scale(1.2)">
            <polygon class="seg-a" points="12,0 38,0 43,5 38,10 12,10 7,5" fill="#334155"/>
            <polygon class="seg-b" points="45,7 50,12 50,38 45,43 40,38 40,12" fill="#334155"/>
            <polygon class="seg-c" points="45,47 50,52 50,78 45,83 40,78 40,52" fill="#334155"/>
            <polygon class="seg-d" points="12,80 38,80 43,85 38,90 12,90 7,85" fill="#334155"/>
            <polygon class="seg-e" points="5,47 10,52 10,78 5,83 0,78 0,52" fill="#334155"/>
            <polygon class="seg-f" points="5,7 10,12 10,38 5,43 0,38 0,12" fill="#334155"/>
            <polygon class="seg-g" points="12,40 38,40 43,45 38,50 12,50 7,45" fill="#334155"/>
            <circle class="seg-dp" cx="58" cy="85" r="4.5" fill="#334155"/>
          </g>
        </svg>`;
    }
    updateState() {
        const currents = this.compData.simI_segs || [0,0,0,0,0,0,0];
        const segClasses = ['.seg-a', '.seg-b', '.seg-c', '.seg-d', '.seg-e', '.seg-f', '.seg-g'];
        for (let i = 0; i < 7; i++) {
            this.setPinActive(`pin-in-${i}`, (this.compData.vd && this.compData.vd[i] > 1.5));
            let current = Math.abs(currents[i]);
            let intensity = Math.min(1, current / 0.02);
            const isOn = intensity > 0.005;
            let r = Math.round(51 + (intensity * 188)), g = Math.round(65 + (intensity * 3)), b = Math.round(85 - (intensity * 17));
            let isBlown = current > 0.06;
            if (isBlown) { r = 255; g = 255; b = 255; }
            
            const segEl = this.contentDiv.querySelector(segClasses[i]);
            if (segEl) {
                segEl.setAttribute('fill', isOn ? `rgb(${r}, ${g}, ${b})` : '#334155');
                if (isOn && !isBlown) segEl.style.filter = `drop-shadow(0 0 ${1 + intensity * 4}px rgba(239, 68, 68, ${0.2 + intensity * 0.6}))`;
                else if (isBlown) segEl.style.filter = `drop-shadow(0 0 8px rgba(255, 255, 255, 0.9))`;
                else segEl.style.filter = 'none';
            }
        }
        this.setPinActive('pin-out-0', currents.some(c => Math.abs(c) > 1e-6));
    }
}
UIRegistry['seven_segment'] = SevenSegmentUI;

class LedBargraphUI extends BaseUIComponent {
    static getDimensions() { return [80, 220]; }
    getSVG() {
        return `<svg width="80" height="220" viewBox="0 0 80 220">
          <rect x="20" y="5" width="50" height="210" rx="3" ry="3" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
          <line class="pin-in-10" x1="40" y1="0" x2="40" y2="5" stroke="#ef4444" stroke-width="3"/>
          <text x="40" y="-3" font-size="10" fill="#ef4444" font-weight="bold" text-anchor="middle" font-family="monospace">V+</text>
          ${Array.from({length: 10}).map((_, i) => `<line class="pin-in-${i}" x1="0" y1="${20+i*20}" x2="20" y2="${20+i*20}" stroke="#006600" stroke-width="3"/> <rect class="led-seg-${i}" x="25" y="${12+i*20}" width="40" height="15" rx="1" fill="#334155"/>`).join('')}
        </svg>`;
    }
    updateState() {
        if (this.compData.simI_segs) {
            for (let i = 0; i < 10; i++) {
                const segEl = this.contentDiv.querySelector(`.led-seg-${i}`);
                if (segEl) {
                    if (this.compData.simI_segs[i] > 0.001) {
                        let color = i >= 8 ? '#ef4444' : (i >= 6 ? '#eab308' : '#22c55e');
                        segEl.setAttribute('fill', color);
                        segEl.style.filter = `drop-shadow(0 0 6px ${color})`;
                    } else {
                        segEl.setAttribute('fill', '#334155');
                        segEl.style.filter = 'none';
                    }
                }
            }
        }
    }
}
UIRegistry['led_bargraph'] = LedBargraphUI;

// -----------------------------------------------------
// KELOMPOK OP-AMP
// -----------------------------------------------------
class OpAmpBasicUI extends BaseUIComponent {
    static getDimensions() { return [80, 60]; }
    getSVG() {
        const is5 = this.compData.type === 'opamp_5pin';
        return `<svg width="80" height="60" viewBox="0 0 80 60">
            <polygon points="20,5 ${is5?'60':'70'},30 20,55" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
            <line class="pin-in-0" x1="0" y1="${is5?'20':'18'}" x2="20" y2="${is5?'20':'18'}" stroke="#006600" stroke-width="3"/>
            <line class="pin-in-1" x1="0" y1="${is5?'40':'42'}" x2="20" y2="${is5?'40':'42'}" stroke="#006600" stroke-width="3"/>
            ${is5 ? `<line class="pin-in-2" x1="40" y1="0" x2="40" y2="17" stroke="#006600" stroke-width="2"/><line class="pin-in-3" x1="40" y1="60" x2="40" y2="43" stroke="#006600" stroke-width="2"/><text x="50" y="14" font-size="9" font-weight="bold" fill="#1e293b">V+</text><text x="50" y="55" font-size="9" font-weight="bold" fill="#1e293b">V-</text>` : `<text x="42" y="34" class="comp-label" font-size="9" font-weight="bold">741</text>`}
            <line class="pin-out-0" x1="${is5?'60':'70'}" y1="30" x2="80" y2="30" stroke="#006600" stroke-width="3"/>
            <text x="24" y="${is5?'24':'22'}" fill="#1e293b" font-family="monospace" font-size="12" font-weight="bold">+</text>
            <text x="24" y="${is5?'44':'44'}" fill="#1e293b" font-family="monospace" font-size="12" font-weight="bold">-</text>
        </svg>`;
    }
    updateState() {
        super.updateState();
        this.setPinActive('pin-out-0', this.compData.outputState === 1);
    }
}
UIRegistry['opamp'] = OpAmpBasicUI; UIRegistry['opamp_5pin'] = OpAmpBasicUI;

class OpAmp741UI extends BaseUIComponent {
    static getDimensions() { return [120, 100]; }
    getSVG() {
        return `<svg width="120" height="100" viewBox="0 0 120 100">
          <line class="pin-in-0" x1="0" y1="30" x2="30" y2="30" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-1" x1="0" y1="70" x2="30" y2="70" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-2" x1="60" y1="0" x2="60" y2="30" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-3" x1="60" y1="100" x2="60" y2="70" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="90" y1="50" x2="120" y2="50" stroke="#006600" stroke-width="3"/>
          <polygon class="anim-body" points="30,10 90,50 30,90" fill="#1e293b" stroke="#1e293b" stroke-width="2" stroke-linejoin="round"/>
          <text x="40" y="34" font-size="14" font-weight="bold" fill="#94a3b8" text-anchor="middle">-</text>
          <text x="40" y="74" font-size="12" font-weight="bold" fill="#94a3b8" text-anchor="middle">+</text>
          <text x="60" y="40" font-size="8" font-weight="bold" fill="#ef4444" text-anchor="middle">V+</text>
          <text x="60" y="66" font-size="8" font-weight="bold" fill="#3b82f6" text-anchor="middle">V-</text>
          <text x="50" y="53" font-size="9" font-weight="bold" fill="#cbd5e1">741</text>
        </svg>`;
    }
    updateState() {
        if (this.compData.inputStates) {
            this.setPinActive('pin-in-0', Math.abs(this.compData.inputStates[0]) > 0.5); 
            this.setPinActive('pin-in-1', Math.abs(this.compData.inputStates[1]) > 0.5); 
            this.setPinActive('pin-in-2', this.compData.inputStates[2] > 2.0);           
            this.setPinActive('pin-in-3', this.compData.inputStates[3] < -2.0);          
        }
        const vOut = this.compData.outVoltage || 0;
        const pinOutEl = this.contentDiv.querySelector('.pin-out-0');
        if (pinOutEl) {
            if (Math.abs(vOut) < 0.1) {
                pinOutEl.setAttribute('stroke', '#64748b'); pinOutEl.style.filter = 'none';
            } else if (vOut > 0) {
                const i = Math.min(vOut / 12.0, 1.0); 
                pinOutEl.setAttribute('stroke', `rgb(${Math.round(34-i*34)}, ${Math.round(197+i*58)}, ${Math.round(94-i*94)})`);
                pinOutEl.style.filter = `drop-shadow(0 0 ${2+i*6}px rgba(34, 197, 94, ${0.4+i*0.6}))`;
            } else {
                const i = Math.min(Math.abs(vOut) / 12.0, 1.0);
                pinOutEl.setAttribute('stroke', `rgb(${Math.round(59-i*59)}, ${Math.round(130+i*125)}, ${Math.round(246+i*9)})`);
                pinOutEl.style.filter = `drop-shadow(0 0 ${2+i*6}px rgba(59, 130, 246, ${0.4+i*0.6}))`;
            }
        }
        const body = this.contentDiv.querySelector('.anim-body');
        if (body && this.compData.inputStates) {
            body.setAttribute('fill', (this.compData.inputStates[2] >= 5.0 || this.compData.inputStates[3] <= -5.0) ? '#1e293b' : '#0f172a');
        }
    }
}
UIRegistry['opamp_lm741'] = OpAmp741UI;

// -----------------------------------------------------
// KELOMPOK GERBANG LOGIKA & FLIP-FLOP
// -----------------------------------------------------
class LogicGateUI extends BaseUIComponent {
    static getDimensions() { return [80, 60]; }
    getSVG() {
        const t = this.compData.type;
        let path = "", extra = "";
        if (t==='and'||t==='nand') { path = `<path d="M 15 10 L 40 10 A 20 20 0 0 1 40 50 L 15 50 Z" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>`; if(t==='nand') extra = `<circle cx="65" cy="30" r="4" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>`; } 
        else if (t==='or'||t==='nor') { path = `<path d="M 15 10 Q 30 10 65 30 Q 30 50 15 50 Q 25 30 15 10 Z" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>`; if(t==='nor') extra = `<circle cx="68" cy="30" r="4" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>`; } 
        else if (t==='xor'||t==='xnor') { path = `<path d="M 8 10 Q 18 30 8 50" fill="none" stroke="#1e293b" stroke-width="2"/><path d="M 14 10 Q 29 10 65 30 Q 29 50 14 50 Q 24 30 14 10 Z" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>`; if(t==='xnor') extra = `<circle cx="68" cy="30" r="4" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>`; } 
        else if (t==='not') { path = `<polygon points="20,15 50,30 20,45" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/><circle cx="54" cy="30" r="4" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>`; }
        return `<svg width="80" height="60" viewBox="0 0 80 60">
          <line class="pin-in-0" x1="0" y1="${t==='not'?30:20}" x2="${t==='not'?20:15}" y2="${t==='not'?30:20}" stroke="#006600" stroke-width="3"/>
          ${t!=='not' ? `<line class="pin-in-1" x1="0" y1="40" x2="15" y2="40" stroke="#006600" stroke-width="3"/>` : ''}
          <line class="pin-out-0" x1="${t==='not'?58:60}" y1="30" x2="80" y2="30" stroke="#006600" stroke-width="3"/>
          ${path}${extra}
          <text x="35" y="60" class="comp-label" text-anchor="middle">${t.toUpperCase()}</text>
        </svg>`;
    }
    updateState() {
        super.updateState();
        this.setPinActive('pin-out-0', this.compData.outputState === 1);
    }
}
['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'].forEach(t => UIRegistry[t] = LogicGateUI);

class ClockPulseUI extends BaseUIComponent {
    static getDimensions() { return [60, 40]; }
    getSVG() {
        return `<svg width="60" height="40" viewBox="0 0 60 40">
          <rect class="anim-body" x="5" y="5" width="40" height="30" rx="4" fill="#0f172a" stroke="#3b82f6" stroke-width="2"/>
          <path d="M 10 15 L 15 15 L 15 8 L 25 8 L 25 22 L 35 22 L 35 15 L 40 15" fill="none" stroke="#22c55e" stroke-width="2"/>
          <line class="pin-out-0" x1="45" y1="20" x2="60" y2="20" stroke="#006600" stroke-width="3"/>
          <circle class="anim-indicator" cx="10" cy="10" r="3" fill="#ef4444"/>
          <text class="anim-text val-trigger" x="25" y="32" font-size="9" fill="#38bdf8" font-weight="bold" text-anchor="middle" style="cursor:pointer; pointer-events:auto;">2Hz</text>
        </svg>`;
    }
    updateState(isSimActive) {
        const isHigh = this.compData.state === '1';
        this.setPinActive('pin-out-0', isHigh && isSimActive);
        const ind = this.contentDiv.querySelector('.anim-indicator');
        if (ind) ind.setAttribute('fill', isSimActive ? (isHigh ? '#22c55e' : '#ef4444') : '#475569');
        const txt = this.contentDiv.querySelector('.anim-text');
        if (txt) txt.textContent = (this.compData.freqValue || 2) + 'Hz';
    }
}
UIRegistry['clock_pulse'] = ClockPulseUI;

class FlipFlopUI extends BaseUIComponent {
    static getDimensions() { return [80, 90]; } // Gunakan max untuk aman (SR/JK)
    getSVG() {
        const t = this.compData.type;
        if (t === 'ff_sr') return `<svg width="80" height="90" viewBox="0 0 80 90"><rect class="anim-body" x="20" y="5" width="40" height="80" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/><line class="pin-in-0" x1="0" y1="20" x2="20" y2="20" stroke="#006600" stroke-width="3"/><line class="pin-in-1" x1="0" y1="70" x2="20" y2="70" stroke="#006600" stroke-width="3"/><line class="pin-in-2" x1="0" y1="45" x2="20" y2="45" stroke="#006600" stroke-width="3"/><line class="pin-out-0" x1="60" y1="20" x2="80" y2="20" stroke="#006600" stroke-width="3"/><line class="pin-out-1" x1="60" y1="70" x2="80" y2="70" stroke="#006600" stroke-width="3"/><polyline points="20,40 25,45 20,50" fill="none" stroke="#1e293b" stroke-width="1.5"/><text x="24" y="24" class="comp-label" font-size="10">S</text><text x="24" y="74" class="comp-label" font-size="10">R</text><text x="56" y="24" class="comp-label" text-anchor="end" font-size="10">Q</text><text x="56" y="74" class="comp-label" text-anchor="end" font-size="10">Q̅</text><text x="40" y="8" class="comp-label" text-anchor="middle" font-size="8" fill="gray">SR FF</text></svg>`;
        if (t === 'ff_d') return `<svg width="80" height="80" viewBox="0 0 80 80"><rect class="anim-body" x="20" y="10" width="40" height="60" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/><line class="pin-in-0" x1="0" y1="25" x2="20" y2="25" stroke="#006600" stroke-width="3"/><line class="pin-in-1" x1="0" y1="55" x2="20" y2="55" stroke="#006600" stroke-width="3"/><polyline points="20,50 25,55 20,60" fill="none" stroke="#1e293b" stroke-width="1.5"/><line class="pin-in-2" x1="40" y1="0" x2="40" y2="6" stroke="#006600" stroke-width="3"/><circle cx="40" cy="8" r="2" fill="#e8e6d3" stroke="#1e293b" stroke-width="1.5"/><line class="pin-in-3" x1="40" y1="80" x2="40" y2="74" stroke="#006600" stroke-width="3"/><circle cx="40" cy="72" r="2" fill="#e8e6d3" stroke="#1e293b" stroke-width="1.5"/><line class="pin-out-0" x1="60" y1="25" x2="80" y2="25" stroke="#006600" stroke-width="3"/><line class="pin-out-1" x1="60" y1="55" x2="80" y2="55" stroke="#006600" stroke-width="3"/><text x="24" y="29" class="comp-label" font-size="10">D</text><text x="56" y="29" class="comp-label" text-anchor="end" font-size="10">Q</text><text x="56" y="59" class="comp-label" text-anchor="end" font-size="10">Q̅</text><text x="40" y="22" class="comp-label" text-anchor="middle" font-size="9">S</text><text x="40" y="66" class="comp-label" text-anchor="middle" font-size="9">R</text><text x="40" y="44" class="comp-label" text-anchor="middle" font-weight="bold" font-size="10">7474</text></svg>`;
        if (t === 'ff_jk') return `<svg width="80" height="90" viewBox="0 0 80 90"><rect class="anim-body" x="20" y="10" width="40" height="70" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/><line class="pin-in-0" x1="0" y1="25" x2="20" y2="25" stroke="#006600" stroke-width="3"/><line class="pin-in-1" x1="0" y1="65" x2="20" y2="65" stroke="#006600" stroke-width="3"/><line class="pin-in-2" x1="0" y1="45" x2="20" y2="45" stroke="#006600" stroke-width="3"/><polyline points="20,40 25,45 20,50" fill="none" stroke="#1e293b" stroke-width="1.5"/><line class="pin-in-3" x1="40" y1="0" x2="40" y2="6" stroke="#006600" stroke-width="3"/><circle cx="40" cy="8" r="2" fill="#e8e6d3" stroke="#1e293b" stroke-width="1.5"/><line class="pin-in-4" x1="40" y1="90" x2="40" y2="84" stroke="#006600" stroke-width="3"/><circle cx="40" cy="82" r="2" fill="#e8e6d3" stroke="#1e293b" stroke-width="1.5"/><line class="pin-out-0" x1="60" y1="25" x2="80" y2="25" stroke="#006600" stroke-width="3"/><line class="pin-out-1" x1="60" y1="65" x2="80" y2="65" stroke="#006600" stroke-width="3"/><text x="24" y="29" class="comp-label" font-size="10">J</text><text x="24" y="69" class="comp-label" font-size="10">K</text><text x="56" y="29" class="comp-label" text-anchor="end" font-size="10">Q</text><text x="56" y="69" class="comp-label" text-anchor="end" font-size="10">Q̅</text><text x="40" y="22" class="comp-label" text-anchor="middle" font-size="9">S</text><text x="40" y="76" class="comp-label" text-anchor="middle" font-size="9">R</text><text x="40" y="49" class="comp-label" text-anchor="middle" font-weight="bold" font-size="10">7476</text></svg>`;
        if (t === 'ff_t') return `<svg width="80" height="80" viewBox="0 0 80 80"><rect class="anim-body" x="20" y="5" width="40" height="70" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/><line class="pin-in-0" x1="0" y1="20" x2="20" y2="20" stroke="#006600" stroke-width="3"/><line class="pin-in-1" x1="0" y1="60" x2="20" y2="60" stroke="#006600" stroke-width="3"/><line class="pin-out-0" x1="60" y1="20" x2="80" y2="20" stroke="#006600" stroke-width="3"/><line class="pin-out-1" x1="60" y1="60" x2="80" y2="60" stroke="#006600" stroke-width="3"/><polyline points="20,55 25,60 20,65" fill="none" stroke="#1e293b" stroke-width="1.5"/><text x="24" y="24" class="comp-label" font-size="10">T</text><text x="56" y="24" class="comp-label" text-anchor="end" font-size="10">Q</text><text x="56" y="64" class="comp-label" text-anchor="end" font-size="10">Q̅</text><text x="40" y="44" class="comp-label" text-anchor="middle" font-weight="bold" font-size="10">T FF</text></svg>`;
    }
    updateState() {
        const qActive = this.compData.outputState === 1;
        this.setPinActive('pin-out-0', qActive); this.setPinActive('pin-out-1', !qActive); 
        if (this.compData.inputStates) {
            for(let i=0; i<this.compData.inputs; i++) this.setPinActive(`pin-in-${i}`, this.compData.inputStates[i] > 2.5);
        }
        const body = this.contentDiv.querySelector('.anim-body');
        if (body) body.setAttribute('fill', qActive ? '#dcfce7' : '#e8e6d3');
    }
}
['ff_sr', 'ff_d', 'ff_jk', 'ff_t'].forEach(t => UIRegistry[t] = FlipFlopUI);

// -----------------------------------------------------
// KELOMPOK DIGITAL IC (4017, 4518, 4511, 4026)
// -----------------------------------------------------
class DigitalIC4017UI extends BaseUIComponent {
    static getDimensions() { return [120, 240]; }
    getSVG() {
        return `<svg width="120" height="240" viewBox="0 0 120 240">
          <rect class="anim-body" x="30" y="10" width="60" height="220" rx="4" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <circle cx="60" cy="22" r="4" fill="#1e293b"/>
          <line class="pin-in-0" x1="0" y1="60" x2="30" y2="60" stroke="#006600" stroke-width="3"/><line class="pin-in-1" x1="0" y1="100" x2="30" y2="100" stroke="#006600" stroke-width="3"/><line class="pin-in-2" x1="0" y1="140" x2="30" y2="140" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-3" x1="60" y1="0" x2="60" y2="10" stroke="#006600" stroke-width="3"/><line class="pin-in-4" x1="60" y1="240" x2="60" y2="230" stroke="#006600" stroke-width="3"/>
          <polyline points="30,55 38,60 30,65" fill="none" stroke="#1e293b" stroke-width="1.5"/>
          <text x="40" y="64" class="comp-label" font-size="10">CLK</text><text x="35" y="104" class="comp-label" font-size="10">ENA</text><text x="35" y="144" class="comp-label" font-size="10">RST</text>
          <text x="60" y="36" class="comp-label" text-anchor="middle" font-size="9">VCC</text><text x="60" y="222" class="comp-label" text-anchor="middle" font-size="9">GND</text>
          <text x="45" y="160" class="comp-label" text-anchor="middle" font-size="16" font-weight="bold" transform="rotate(-90 50 160)">CD4017</text>
          ${Array.from({length: 11}).map((_, i) => `<line class="pin-out-${i}" x1="90" y1="${20 + i*20}" x2="120" y2="${20 + i*20}" stroke="#006600" stroke-width="3"/><text x="86" y="${24 + i*20}" class="comp-label" text-anchor="end" font-weight="bold" font-size="10" fill="${i === 10 ? '#0284c7' : '#000'}">${i < 10 ? 'Q'+i : 'CO'}</text>`).join('')}
        </svg>`;
    }
    updateState() {
        const vccPowered = (this.compData.simV_vcc || 0) > 2.5; 
        if (this.compData.inputStates) {
            this.setPinActive('pin-in-0', this.compData.inputStates[0] > 2.5); 
            this.setPinActive('pin-in-1', this.compData.inputStates[1] > 2.5); 
            this.setPinActive('pin-in-2', this.compData.inputStates[2] > 2.5); 
            this.setPinActive('pin-in-4', this.compData.inputStates[4] > 0);   
        }
        this.setPinActive('pin-in-3', vccPowered); 
        for (let i = 0; i < 11; i++) {
            const isActive = (this.compData.outputStates && this.compData.outputStates[i] === 1);
            this.setPinActive(`pin-out-${i}`, isActive && vccPowered);
        }
        const body = this.contentDiv.querySelector('.anim-body');
        if (body) body.setAttribute('fill', vccPowered ? '#fef08a' : '#e8e6d3');
    }
}
UIRegistry['ic_4017'] = DigitalIC4017UI;

class DigitalIC4518UI extends BaseUIComponent {
    static getDimensions() { return [100, 90]; }
    getSVG() {
        return `<svg width="100" height="90" viewBox="0 0 100 90">
          <rect class="anim-body" x="20" y="5" width="60" height="80" rx="2" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <circle cx="50" cy="12" r="3" fill="#1e293b"/>
          <line class="pin-in-0" x1="0" y1="25" x2="20" y2="25" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-1" x1="0" y1="45" x2="20" y2="45" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-2" x1="0" y1="65" x2="20" y2="65" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="80" y1="20" x2="100" y2="20" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-1" x1="80" y1="40" x2="100" y2="40" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-2" x1="80" y1="60" x2="100" y2="60" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-3" x1="80" y1="80" x2="100" y2="80" stroke="#006600" stroke-width="3"/>
          <polyline points="20,20 25,25 20,30" fill="none" stroke="#1e293b" stroke-width="1.5"/> 
          <text x="26" y="29" class="comp-label" font-size="9">CLK</text><text x="24" y="49" class="comp-label" font-size="9">EN</text><text x="24" y="69" class="comp-label" font-size="9">RST</text>
          <text x="76" y="24" class="comp-label" text-anchor="end" font-size="9">Q0</text><text x="76" y="44" class="comp-label" text-anchor="end" font-size="9">Q1</text>
          <text x="76" y="64" class="comp-label" text-anchor="end" font-size="9">Q2</text><text x="76" y="81" class="comp-label" text-anchor="end" font-size="9">Q3</text>
          <text x="50" y="80" class="comp-label" text-anchor="middle" font-weight="bold" font-size="10">4518</text>
          <rect x="40" y="35" width="20" height="24" rx="2" fill="#0f172a"/>
          <text class="anim-text val-trigger" x="50" y="53" fill="#facc15" font-size="16" font-weight="bold" text-anchor="middle" style="cursor:pointer; pointer-events:auto;">-</text>
        </svg>`;
    }
    updateState() {
        const outStates = this.compData.outStates || [false, false, false, false];
        for(let i=0; i<4; i++) this.setPinActive(`pin-out-${i}`, outStates[i]);
        const countTxt = this.contentDiv.querySelector('.anim-text');
        if (countTxt) countTxt.textContent = this.compData.count !== undefined ? this.compData.count : '-';
        const body = this.contentDiv.querySelector('.anim-body');
        if (body) body.setAttribute('fill', this.compData.count !== undefined ? '#fef08a' : '#e8e6d3');
    }
}
UIRegistry['ic_4518'] = DigitalIC4518UI;

class DigitalIC4511UI extends BaseUIComponent {
    static getDimensions() { return [120, 160]; }
    getSVG() {
        return `<svg width="120" height="160" viewBox="0 0 120 160">
          <rect class="anim-body" x="30" y="5" width="60" height="150" rx="4" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <circle cx="60" cy="12" r="3" fill="#1e293b"/>
          ${Array.from({length: 7}).map((_, i) => `<line class="pin-in-${i}" x1="0" y1="${20+i*20}" x2="30" y2="${20+i*20}" stroke="#006600" stroke-width="3"/> <line class="pin-out-${i}" x1="90" y1="${20+i*20}" x2="120" y2="${20+i*20}" stroke="#006600" stroke-width="3"/>`).join('')}
          <text x="34" y="24" class="comp-label" font-weight="bold">A</text><text x="34" y="44" class="comp-label" font-weight="bold">B</text><text x="34" y="64" class="comp-label" font-weight="bold">C</text><text x="34" y="84" class="comp-label" font-weight="bold">D</text>
          <text x="34" y="104" class="comp-label" font-size="9" fill="#0284c7">LT</text><text x="34" y="124" class="comp-label" font-size="9" fill="#0284c7">BI</text><text x="34" y="144" class="comp-label" font-size="9" fill="#0284c7">LE</text>
          <text x="86" y="24" class="comp-label" text-anchor="end" font-weight="bold">a</text><text x="86" y="44" class="comp-label" text-anchor="end" font-weight="bold">b</text><text x="86" y="64" class="comp-label" text-anchor="end" font-weight="bold">c</text><text x="86" y="84" class="comp-label" text-anchor="end" font-weight="bold">d</text><text x="86" y="104" class="comp-label" text-anchor="end" font-weight="bold">e</text><text x="86" y="124" class="comp-label" text-anchor="end" font-weight="bold">f</text><text x="86" y="144" class="comp-label" text-anchor="end" font-weight="bold">g</text>
          <text x="60" y="85" class="comp-label" text-anchor="middle" font-size="16" font-weight="bold" transform="rotate(-90 60 85)">CD4511</text>
        </svg>`;
    }
    updateState() {
        if (this.compData.inputStates) {
            for(let i=0; i<7; i++) this.setPinActive(`pin-in-${i}`, this.compData.inputStates[i] > 2.5);
        }
        const outStates = this.compData.outStates || [0,0,0,0,0,0,0];
        for (let i = 0; i < 7; i++) this.setPinActive(`pin-out-${i}`, outStates[i] === 1);
        
        const isWorking = outStates.includes(1);
        const body = this.contentDiv.querySelector('.anim-body');
        if (body) body.setAttribute('fill', isWorking ? '#fef08a' : '#e8e6d3');
    }
}
UIRegistry['ic_4511'] = DigitalIC4511UI;

class DigitalIC4026UI extends BaseUIComponent {
    static getDimensions() { return [120, 220]; }
    getSVG() {
        return `<svg width="120" height="220" viewBox="0 0 120 220">
          <rect class="anim-body" x="30" y="5" width="60" height="210" rx="4" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <circle cx="60" cy="12" r="3" fill="#1e293b"/>
          <line class="pin-in-0" x1="0" y1="30" x2="30" y2="30" stroke="#006600" stroke-width="3"/><line class="pin-in-1" x1="0" y1="80" x2="30" y2="80" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-2" x1="0" y1="130" x2="30" y2="130" stroke="#006600" stroke-width="3"/><line class="pin-in-3" x1="0" y1="180" x2="30" y2="180" stroke="#006600" stroke-width="3"/>
          ${Array.from({length: 10}).map((_, i) => `<line class="pin-out-${i}" x1="90" y1="${20 + i*20}" x2="120" y2="${20 + i*20}" stroke="#006600" stroke-width="3"/>`).join('')}
          <polyline points="30,25 36,30 30,35" fill="none" stroke="#1e293b" stroke-width="1.5"/>
          <text x="38" y="34" class="comp-label" font-size="9" font-weight="bold">CLK</text><text x="34" y="84" class="comp-label" font-size="9" font-weight="bold">INH</text>
          <text x="34" y="134" class="comp-label" font-size="9" font-weight="bold">RST</text><text x="34" y="184" class="comp-label" font-size="9" font-weight="bold" fill="#0284c7">DEI</text>
          <text x="86" y="24" class="comp-label" text-anchor="end" font-weight="bold">a</text><text x="86" y="44" class="comp-label" text-anchor="end" font-weight="bold">b</text><text x="86" y="64" class="comp-label" text-anchor="end" font-weight="bold">c</text><text x="86" y="84" class="comp-label" text-anchor="end" font-weight="bold">d</text><text x="86" y="104" class="comp-label" text-anchor="end" font-weight="bold">e</text><text x="86" y="124" class="comp-label" text-anchor="end" font-weight="bold">f</text><text x="86" y="144" class="comp-label" text-anchor="end" font-weight="bold">g</text>
          <text x="86" y="164" class="comp-label" text-anchor="end" font-size="10" font-weight="bold" fill="#ef4444">CO</text><text x="86" y="184" class="comp-label" text-anchor="end" font-size="8" font-weight="bold" fill="#0284c7">DEO</text><text x="86" y="204" class="comp-label" text-anchor="end" font-size="8" font-weight="bold" fill="#8b5cf6">UCS</text>
          <text x="60" y="110" class="comp-label" text-anchor="middle" font-size="16" font-weight="bold" transform="rotate(-90 60 110)">CD4026</text>
        </svg>`;
    }
    updateState() {
        if (this.compData.inputStates) {
            for(let i=0; i<4; i++) this.setPinActive(`pin-in-${i}`, this.compData.inputStates[i] > 2.5);
        }
        const outStates = this.compData.outStates || [0,0,0,0,0,0,0,0,0,0];
        for (let i = 0; i < 10; i++) this.setPinActive(`pin-out-${i}`, outStates[i] === 1);
        
        const isWorking = outStates.slice(0, 7).includes(1);
        const body = this.contentDiv.querySelector('.anim-body');
        if (body) body.setAttribute('fill', isWorking ? '#fef08a' : '#e8e6d3');
    }
}
UIRegistry['ic_4026'] = DigitalIC4026UI;

class IC555UI extends BaseUIComponent {
    static getDimensions() { return [120, 160]; }
    getSVG() {
        return `<svg width="120" height="160" viewBox="0 0 120 160">
          <rect class="anim-body" x="30" y="20" width="60" height="120" fill="#e8e6d3" stroke="#1e293b" stroke-width="2"/>
          <circle cx="38" cy="28" r="4" fill="#1e293b"/>
          <line class="pin-in-1" x1="0" y1="100" x2="30" y2="100" stroke="#006600" stroke-width="3"/><line class="pin-in-2" x1="0" y1="40" x2="30" y2="40" stroke="#006600" stroke-width="3"/><line class="pin-in-3" x1="0" y1="70" x2="30" y2="70" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="120" y1="40" x2="90" y2="40" stroke="#006600" stroke-width="3"/><line class="pin-in-4" x1="120" y1="100" x2="90" y2="100" stroke="#006600" stroke-width="3"/><line class="pin-out-1" x1="120" y1="70" x2="90" y2="70" stroke="#006600" stroke-width="3"/>
          <line class="pin-in-5" x1="60" y1="0" x2="60" y2="20" stroke="#006600" stroke-width="3"/><line class="pin-in-0" x1="60" y1="160" x2="60" y2="140" stroke="#006600" stroke-width="3"/>
          <text x="35" y="104" class="comp-label" font-size="10">TR</text><text x="37" y="44" class="comp-label" font-size="10">R</text><circle cx="34" cy="41" r="2" fill="none" stroke="black"/><text x="35" y="74" class="comp-label" font-size="10">CTRL</text>
          <text x="85" y="44" class="comp-label" text-anchor="end" font-size="10">out</text><text x="85" y="104" class="comp-label" text-anchor="end" font-size="10">TH</text><text x="85" y="74" class="comp-label" text-anchor="end" font-size="10">DC</text>
          <text x="60" y="32" class="comp-label" text-anchor="middle" font-size="10">VCC</text><text x="60" y="135" class="comp-label" text-anchor="middle" font-size="10">GND</text><text x="60" y="85" class="comp-label" font-weight="bold" font-size="16" text-anchor="middle">555</text>
        </svg>`;
    }
    updateState() {
        const isActive = this.compData.outputState === 1;
        const vccPowered = (this.compData.simV_vcc || 0) > 0;
        this.setPinActive('pin-in-5', vccPowered); 
        this.setPinActive('pin-out-0', isActive);  
        
        if (this.compData.inputStates) {
            this.setPinActive('pin-in-0', this.compData.inputStates[0] > 0);   
            this.setPinActive('pin-in-1', this.compData.inputStates[1] > 2.5); 
            this.setPinActive('pin-in-2', this.compData.inputStates[2] > 2.5); 
            this.setPinActive('pin-in-3', this.compData.inputStates[3] > 2.5); 
            this.setPinActive('pin-in-4', this.compData.inputStates[4] > 2.5); 
        }
        
        this.setPinActive('pin-out-1', !isActive && vccPowered);
        const body = this.contentDiv.querySelector('.anim-body');
        if (body) body.setAttribute('fill', isActive ? '#fef08a' : '#e8e6d3');
    }
}
UIRegistry['ic_555'] = IC555UI;

class ICLM3914UI extends BaseUIComponent {
    static getDimensions() { return [140, 240]; }
    getSVG() {
        return `<svg width="140" height="240" viewBox="0 0 140 240">
          <rect class="anim-body" x="30" y="20" width="80" height="200" rx="4" ry="4" fill="#1e293b" stroke="#1e293b" stroke-width="2"/>
          <path d="M 60 20 A 10 10 0 0 0 80 20" fill="none" stroke="#1e293b" stroke-width="2"/>
          <line class="pin-in-6" x1="70" y1="0" x2="70" y2="20" stroke="#006600" stroke-width="3"/><text x="80" y="15" font-size="10" fill="#ef4444" font-weight="bold" font-family="monospace">V+</text>
          <line class="pin-in-7" x1="70" y1="220" x2="70" y2="240" stroke="#006600" stroke-width="3"/><text x="80" y="235" font-size="10" fill="#3b82f6" font-weight="bold" font-family="monospace">V-</text>
          <line class="pin-in-0" x1="0" y1="40" x2="30" y2="40" stroke="#006600" stroke-width="3"/><text x="35" y="44" font-size="10" fill="#94a3b8" font-family="monospace">SIG</text>
          <line class="pin-in-1" x1="0" y1="70" x2="30" y2="70" stroke="#006600" stroke-width="3"/><text x="35" y="74" font-size="10" fill="#94a3b8" font-family="monospace">RHI</text>
          <line class="pin-in-2" x1="0" y1="100" x2="30" y2="100" stroke="#006600" stroke-width="3"/><text x="35" y="104" font-size="10" fill="#94a3b8" font-family="monospace">RLO</text>
          <line class="pin-in-3" x1="0" y1="130" x2="30" y2="130" stroke="#006600" stroke-width="3"/><text x="35" y="134" font-size="10" fill="#94a3b8" font-family="monospace">REFO</text>
          <line class="pin-in-4" x1="0" y1="160" x2="30" y2="160" stroke="#006600" stroke-width="3"/><text x="35" y="164" font-size="10" fill="#94a3b8" font-family="monospace">REFA</text>
          <line class="pin-in-5" x1="0" y1="190" x2="30" y2="190" stroke="#006600" stroke-width="3"/><text x="35" y="194" font-size="10" fill="#94a3b8" font-family="monospace">MOD</text>
          ${Array.from({length: 10}).map((_, i) => `<line class="pin-out-${i}" x1="110" y1="${30+i*20}" x2="140" y2="${30+i*20}" stroke="#006600" stroke-width="3"/><text x="105" y="${34+i*20}" font-size="10" fill="#94a3b8" font-family="monospace" text-anchor="end">L${i+1}</text>`).join('')}
          <text x="70" y="130" font-size="14" font-weight="bold" fill="#cbd5e1" transform="rotate(-90 70 120)" text-anchor="middle">LM3914</text>
        </svg>`;
    }
    updateState() {
        if (this.compData.inputStates) {
            for(let i=0; i<=7; i++) this.setPinActive(`pin-in-${i}`, this.compData.inputStates[i]);
        }
        if (this.compData.outStates) {
            for (let i = 0; i < 10; i++) {
                const pinOutEl = this.contentDiv.querySelector(`.pin-out-${i}`);
                if (pinOutEl) {
                    if (this.compData.outStates[i]) {
                        pinOutEl.setAttribute('stroke', '#ef4444'); 
                        pinOutEl.style.filter = 'drop-shadow(0 0 4px rgba(239, 68, 68, 0.8))';
                    } else {
                        pinOutEl.setAttribute('stroke', '#64748b');
                        pinOutEl.style.filter = 'none';
                    }
                }
            }
        }
    }
}
UIRegistry['ic_lm3914'] = ICLM3914UI;

// =========================================================
// KELOMPOK SAKLAR MANUAL (SWITCH & PUSH BUTTON)
// =========================================================

// 1. Switch Digital (Logika 1/0)
class DigitalSwitchUI extends BaseUIComponent {
    static getDimensions() { return [60, 40]; }
    getSVG() {
        return `<svg width="60" height="40" viewBox="0 0 60 40">
          <polygon class="anim-body" points="5,5 35,5 45,20 35,35 5,35" fill="#2563eb" stroke="black" stroke-width="1"/>
          <text class="anim-text" x="20" y="26" fill="white" font-family="Arial" font-size="20" font-weight="bold" text-anchor="middle">0</text>
          <line class="pin-out-0" x1="45" y1="20" x2="60" y2="20" stroke="#006600" stroke-width="3"/>
        </svg>`;
    }
    updateState(isSimActive) {
        const isClosed = this.compData.state === '1'; 
        this.setPinActive('pin-out-0', isClosed);
        
        const body = this.contentDiv.querySelector('.anim-body'); 
        const text = this.contentDiv.querySelector('.anim-text');
        if (body) body.setAttribute('fill', isClosed ? '#dc2626' : '#2563eb');
        if (text) text.textContent = this.compData.state || '0';
    }
}
UIRegistry['switch'] = DigitalSwitchUI;

// 2. Saklar SPST (Single Pole Single Throw)
class SwitchSPSTUI extends BaseUIComponent {
    static getDimensions() { return [80, 40]; }
    getSVG() {
        return `<svg width="80" height="40" viewBox="0 0 80 40">
          <line class="pin-in-0" x1="0" y1="20" x2="25" y2="20" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="55" y1="20" x2="80" y2="20" stroke="#006600" stroke-width="3"/>
          <circle cx="25" cy="20" r="3" fill="#1e293b"/>
          <circle cx="55" cy="20" r="3" fill="#1e293b"/>
          <line class="anim-line" x1="25" y1="20" x2="50" y2="10" stroke="black" stroke-width="3"/>
          <rect class="anim-body" x="30" y="30" width="20" height="8" rx="2" fill="#e2e8f0" stroke="black" stroke-width="1"/>
        </svg>`;
    }
    updateState(isSimActive) {
        const isClosed = this.compData.state === '1'; 
        const vState = this.compData.simV > 0;
        this.setPinActive('pin-in-0', vState); 
        this.setPinActive('pin-out-0', isClosed && vState);
        
        const line = this.contentDiv.querySelector('.anim-line'); 
        const body = this.contentDiv.querySelector('.anim-body');
        if (line) { 
            line.setAttribute('x2', isClosed ? '55' : '50'); 
            line.setAttribute('y2', isClosed ? '20' : '10'); 
        }
        if (body) body.setAttribute('fill', isClosed ? '#22c55e' : '#e2e8f0');
    }
}
UIRegistry['switch_spst'] = SwitchSPSTUI;

// 3. Saklar SPDT (Tukar)
class SwitchSPDTUI extends BaseUIComponent {
    static getDimensions() { return [80, 60]; }
    getSVG() {
        return `<svg width="80" height="60" viewBox="0 0 80 60">
          <line class="pin-in-0" x1="0" y1="30" x2="20" y2="30" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-0" x1="60" y1="15" x2="80" y2="15" stroke="#006600" stroke-width="3"/>
          <line class="pin-out-1" x1="60" y1="45" x2="80" y2="45" stroke="#006600" stroke-width="3"/>
          <circle cx="20" cy="30" r="4" fill="#1e293b" stroke="#1e293b" stroke-width="2"/>
          <circle cx="60" cy="15" r="4" fill="#1e293b" stroke="#1e293b" stroke-width="2"/>
          <circle cx="60" cy="45" r="4" fill="#1e293b" stroke="#1e293b" stroke-width="2"/>
          <line class="blade" x1="20" y1="30" x2="56" y2="15" stroke="#ef4444" stroke-width="4" stroke-linecap="round" style="transition: all 0.15s ease-in-out;"/>
        </svg>`;
    }
    updateState(isSimActive) {
        const blade = this.contentDiv.querySelector('.blade');
        if (blade) {
            const isDown = this.compData.state === '1';
            blade.setAttribute('y2', isDown ? '45' : '15');
        }
    }
}
UIRegistry['switch_spdt'] = SwitchSPDTUI;

// 4. Push Button (NO & NC) dengan Logika Event Spesifik
class PushButtonUI extends BaseUIComponent {
    static getDimensions() { return [70, 60]; }
    getSVG() {
        const isNC = this.compData.type === 'push_button_nc';
        
        if (isNC) {
            return `<svg width="70" height="60" viewBox="0 0 70 60">
              <line class="pin-in-0" x1="0" y1="30" x2="21" y2="30" stroke="#006600" stroke-width="3"/>
              <line class="pin-out-0" x1="70" y1="30" x2="49" y2="30" stroke="#006600" stroke-width="3"/>
              <circle cx="23" cy="30" r="3" fill="#e8e6d3" stroke="#000000" stroke-width="3"/>
              <circle cx="47" cy="30" r="3" fill="#e8e6d3" stroke="#000000" stroke-width="3"/>
              <g class="anim-plunger" style="transition: transform 0.05s;">
                 <rect x="21" y="35" width="28" height="4" fill="#e8e6d3" stroke="#000000" stroke-width="3"/>
                 <line x1="35" y1="25" x2="35" y2="35" stroke="#000000" stroke-width="3"/>
                 <rect x="29" y="24" width="12" height="3" fill="#000000"/>
              </g>
              <rect x="15" y="0" width="40" height="30" fill="transparent" style="cursor:pointer; pointer-events:auto;" />
              <g class="lock-btn control-btn lock-down-btn" style="cursor:pointer; pointer-events:auto;" transform="translate(20, 14)">
                 <rect x="-10" y="-10" width="20" height="20" fill="transparent"/><circle cx="0" cy="0" r="5" fill="#000000" stroke="#000000" stroke-width="1"/><polygon points="-1,-2 -4,0 -1,2" fill="#000"/><polygon points="1,-2 4,0 1,2" fill="#000"/>
              </g>
              <g class="unlock-btn control-btn lock-up-btn" style="cursor:pointer; pointer-events:auto;" transform="translate(50, 14)">
                 <rect x="-10" y="-10" width="20" height="20" fill="transparent"/><circle cx="0" cy="0" r="5" fill="#ffffff" stroke="#000000" stroke-width="1"/><polygon points="-1,2 -4,0 -1,-2" fill="#000"/><polygon points="1,2 4,0 1,-2" fill="#000"/>
              </g>
            </svg>`;
        } else {
            return `<svg width="70" height="60" viewBox="0 0 70 60">
              <line class="pin-in-0" x1="0" y1="30" x2="21" y2="30" stroke="#006600" stroke-width="3"/>
              <line class="pin-out-0" x1="70" y1="30" x2="49" y2="30" stroke="#006600" stroke-width="3"/>
              <circle cx="23" cy="30" r="3" fill="#e8e6d3" stroke="#000000" stroke-width="3"/>
              <circle cx="47" cy="30" r="3" fill="#e8e6d3" stroke="#000000" stroke-width="3"/>
              <g class="anim-plunger" style="transition: transform 0.05s;">
                 <rect x="23" y="18" width="24" height="4" fill="#e8e6d3" stroke="#000000" stroke-width="3"/>
                 <line x1="35" y1="19" x2="35" y2="9" stroke="#000000" stroke-width="3"/>
                 <rect x="27" y="6" width="16" height="3" fill="#000000"/>
              </g>
              <rect x="10" y="0" width="40" height="22" fill="transparent" style="cursor:pointer; pointer-events:auto;" />
              <g class="lock-btn control-btn lock-down-btn" style="cursor:pointer; pointer-events:auto;" transform="translate(20, 45)">
                 <rect x="-10" y="-10" width="20" height="20" fill="transparent"/><circle cx="0" cy="0" r="5" fill="#000000" stroke="#000000" stroke-width="1"/><polygon points="-1,-2 -4,0 -1,2" fill="#000"/><polygon points="1,-2 4,0 1,2" fill="#000"/>
              </g>
              <g class="unlock-btn control-btn lock-up-btn" style="cursor:pointer; pointer-events:auto;" transform="translate(50, 45)">
                 <rect x="-10" y="-10" width="20" height="20" fill="transparent"/><circle cx="0" cy="0" r="5" fill="#ffffff" stroke="#000000" stroke-width="1"/><polygon points="-1,2 -4,0 -1,-2" fill="#000"/><polygon points="1,2 4,0 1,-2" fill="#000"/>
              </g>
            </svg>`;
        }
    }
    
    // Keistimewaan Class ini: Mewarisi bindSpecificEvents agar tombol bekerja persis seperti aslinya
    bindSpecificEvents() {
        const startPress = (e) => {
            if (!e.target.closest('.control-btn')) {
                const currentComp = typeof CircuitStore !== 'undefined' ? CircuitStore.components.find(c => c.id === this.id) : null;
                if (currentComp && !currentComp.locked) {
                    currentComp.state = '1';
                    // Paksa render instan saat mouse ditekan
                    if (this.contentDiv.uiInstance) this.contentDiv.uiInstance.updateState(typeof CircuitStore !== 'undefined' ? CircuitStore.isSimulationActive : false);
                }
            }
        };

        const stopPress = (e) => {
            const currentComp = typeof CircuitStore !== 'undefined' ? CircuitStore.components.find(c => c.id === this.id) : null;
            if (currentComp && !currentComp.locked) {
                currentComp.state = '0';
                if (this.contentDiv.uiInstance) this.contentDiv.uiInstance.updateState(typeof CircuitStore !== 'undefined' ? CircuitStore.isSimulationActive : false);
            }
        };
        
        this.contentDiv.addEventListener('mousedown', startPress);
        this.contentDiv.addEventListener('touchstart', startPress, {passive: true});
        this.contentDiv.addEventListener('mouseup', stopPress);
        this.contentDiv.addEventListener('mouseleave', stopPress);
        this.contentDiv.addEventListener('touchend', stopPress);
    }

    updateState(isSimActive) {
        const isPressed = this.compData.state === '1'; 
        const isConducting = this.compData.type === 'push_button' ? isPressed : !isPressed;
        
        this.setPinActive('pin-in-0', isSimActive);
        this.setPinActive('pin-out-0', isConducting && isSimActive);
        
        const plunger = this.contentDiv.querySelector('.anim-plunger');
        const lockBtnCircle = this.contentDiv.querySelector('.lock-btn circle');
        
        if (plunger) {
            plunger.style.transform = isPressed ? 'translateY(4px)' : 'translateY(0)';
        }
        if (lockBtnCircle) {
           lockBtnCircle.setAttribute('fill', this.compData.locked ? '#7f1d1d' : '#ef4444');
        }
    }
}
UIRegistry['push_button'] = PushButtonUI;
UIRegistry['push_button_nc'] = PushButtonUI;