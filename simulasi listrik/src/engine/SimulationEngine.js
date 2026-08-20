// File: src/engine/SimulationEngine.js

const SimulationEngine = {
    isRunning: false,
    nodes: [], // Menyimpan titik simpul (persimpangan kabel) kelistrikan
    nodeVoltage: [], // Menyimpan nilai tegangan untuk masing-masing node
    
    // ─── LANGKAH 1: HELPER FISIKA SEMIKONDUKTOR (NEWTON-RAPHSON) ───
    DiodePhysics: {
        VT: 0.02585, // Tegangan termal (Thermal Voltage) pada suhu ruang 300K (~26mV)
        
        // FUNGSI 1: Damping (PNJLIMIT)
        // Mencegah tebakan tegangan melompat terlalu jauh dan menghasilkan Infinity
        limitVoltageStep(vNew, vOld) {
            const Vcrit = 0.6; // Titik kritis transisi kurva mulai menanjak
            const VT = this.VT;
            
            // Jika tegangan baru naik drastis melampaui Vcrit, paksa naiknya pelan-pelan (logaritmik)
            if (vNew > Vcrit && vNew > vOld) {
                if (vOld > 0) {
                    return vOld + VT * Math.log(1 + (vNew - vOld) / VT);
                } else {
                    return VT * Math.log(vNew / VT);
                }
            }
            // Jika tegangan turun atau masih aman, biarkan saja
            return vNew;
        },

        // FUNGSI 2: Linearisasi Newton-Raphson
        // Mengubah kurva eksponensial LED menjadi Resistor & Sumber Arus sementara
        linearize(vD, Is, n) {
            const nVt = n * this.VT;
            
            // PENGAMAN MATH: Cegah eksponensial meledak (Maksimal e^40)
            let vLimit = vD;
            if (vLimit > 40 * nVt) vLimit = 40 * nVt; 

            // Persamaan Dioda Shockley
            const expTerm = Math.exp(vLimit / nVt);
            const Id = Is * (expTerm - 1); 
            
            // Konduktansi Dinamis (Geq = Turunan dI/dV)
            let Geq = (Is / nVt) * expTerm;
            
            // Batas minimum konduktansi (Cegah pembagian dengan nol / Resistansi tak terhingga)
            if (Geq < 1e-12) Geq = 1e-12; 

            // Arus Ekuivalen Bayangan (Ieq) untuk menipu matriks Gauss-Seidel
            const Ieq = Id - (Geq * vLimit);

            return { Geq, Ieq, Id };
        }
    },
    // ───────────────────────────────────────────────────────────────

    toggle() {
    const simIndicator = document.getElementById('simIndicator');
    const simText = document.getElementById('simText');
    const btnSimulate = document.getElementById('btnSimulate'); // Dipindah ke sini agar terlihat oleh if & else
    
    this.isRunning = !this.isRunning;
    CircuitStore.isSimulationActive = this.isRunning;

    if (this.isRunning) {
        if (simIndicator) simIndicator.className = 'status-indicator status-active';
        if (simText) simText.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Stop Simulasi';
        if (btnSimulate) {
            btnSimulate.classList.remove('btn-primary');
            btnSimulate.classList.add('btn-success');
        }
        CircuitStore.components.forEach(c => {
            if (c.type === 'clock_pulse' || c.type === 'flasher') {
                c._lastToggle = Date.now();
            }
        });
        
        this.buildElectricalNodes(); 
        this.run();
    } else {
        this.stop();
        if (simIndicator) simIndicator.className = 'status-indicator status-ready';
        if (simText) simText.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Mulai Simulasi';
        if (btnSimulate) {
            btnSimulate.classList.remove('btn-success');
            btnSimulate.classList.add('btn-primary');
        }
    }    
},

   stop() {
    this.isRunning = false;
    CircuitStore.isSimulationActive = false;
    
    // Reset semua nilai simulasi ke 0 saat mesin dimatikan
    CircuitStore.components.forEach(c => {
            c.simV = 0;
            c.simI = 0;
            c.rpm = 0;
            if (c.inputStates) c.inputStates.fill(0);
            c.outputState = 0;
                
            if (c.type === 'capacitor') {
                c.chargeV = 0;
                if (c.vHistory) {
                    c.vHistory[0] = 0; 
                    c.vHistory[1] = 0; 
                }
            }
        if (c.type === 'clock_pulse') {
                c.state = c.initialState !== undefined ? c.initialState : '0';
                c._lastToggle = Date.now(); // Reset sinkronisasi timer
            }
        if (c.type === 'ic_4017' || c.type === 'ic_4518' || c.type === 'ic_4511' || c.type === 'ic_4026') {
                c.counter = 0;
                c.count = 0; 
                c.latchedVal = 0;
                c.prevClock = undefined; 
                c.lastClk = undefined;   
                if (c.outputStates) c.outputStates.fill(0);
                if (c.outStates) c.outStates.fill(false);
            }
        if (c.type === 'motor_dc') {
                c.currentRpm = 0; // rpm tampilan sudah 0 di atas, currentRpm internal juga harus 0
            }
        if (c.type === 'servo') {
                c.servoAngle = 0;
                c.isPowered = false;
            }
        if (c.type === 'solenoid') {
                c.plungerPos = 0;
                c.plungerVel = 0;
                c.strokePercent = 0;
            }
        if (c.type === 'logic_probe') {
                c.logicState = 'Z';
            }    
        if (['ff_d', 'ff_t', 'ff_jk', 'ff_sr'].includes(c.type)) {
                c.prevClock = undefined; // Sama seperti ic_4017: paksa baca ulang edge saat Play ditekan
            }    
    // Perbarui visual (matikan LED, dll)
        const contentDiv = document.getElementById(`content-${c.id}`);
            if (contentDiv && typeof ComponentDefs !== 'undefined') {
                ComponentDefs.updateDOMState(c.type, c, contentDiv, c.id);
            }
        });
    },

    run() {
        if (!CircuitStore.isSimulationActive && !this.isRunning) return;
        
        // 1. OTOMATISASI INSTANSIASI OOP: Ubah object mentah menjadi Class secara gaib
        CircuitStore.components.forEach((comp, index) => {
            if (!(comp instanceof BaseComponent)) {
                const ComponentClass = ComponentRegistry[comp.type] || BaseComponent;
                CircuitStore.components[index] = new ComponentClass(comp);
            }
        });

        const currentCompCount = CircuitStore.components.length;
        const currentConnCount = CircuitStore.connections.length;
        if (this._lastCompCount !== currentCompCount || this._lastConnCount !== currentConnCount) {
            this.buildElectricalNodes();
            this._lastCompCount = currentCompCount;
            this._lastConnCount = currentConnCount;
        }
        
        if (!CircuitStore.isSimulationActive && !this.isRunning) return;

        // 2. MESIN WAKTU (TIME ENGINE) PENGGANTI SET_INTERVAL
        const now = Date.now();
        if (!this.lastTime) this.lastTime = now;
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        CircuitStore.components.forEach(comp => {
            if (comp.onTimeUpdate) comp.onTimeUpdate(dt, now);
        });

        // 3. JALANKAN LOGIKA FISIKA & DIGITAL (Delegasi Penuh)
        for (let i = 0; i < 2; i++) {
            this.solveDigitalLogic();
            this.solveAnalogPhysics();
        }
        
        this.updateVisuals();
        
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.isRunning) {
            this.animationId = requestAnimationFrame(() => this.run());
        }
    },

    solveDigitalLogic() {
        for (let iter = 0; iter < 5; iter++) {
            CircuitStore.components.forEach(comp => {
                this.updateInputStates(comp);
                if (comp.solveDigital) comp.solveDigital(this, iter);
            });
        }
    },

    solveAnalogPhysics() {
        if (!this.nodes || this.nodes.length === 0) return;

        // Caching fungsi pencarian agar super cepat
        const nodeMap = {};
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = 0; j < this.nodes[i].length; j++) {
                nodeMap[this.nodes[i][j]] = i;
            }
        }
        this.getNodeIndex = (compId, type, pinIndex) => {
            const pinId = `${compId}-${type}-${pinIndex}`;
            return nodeMap[pinId] !== undefined ? nodeMap[pinId] : -1;
        };

        const MAX_ITER = Math.min(300, Math.max(60, this.nodes.length * 3));
        const EPSILON = 0.001; 
        let lastError = Infinity;
        let stagnationCount = 0;

        for (let i = 0; i < MAX_ITER; i++) {
            let maxError = 0;
            const fixedNodes = new Array(this.nodes.length).fill(false);
            const sumVR = new Array(this.nodes.length).fill(0);
            const sum1R = new Array(this.nodes.length).fill(0);

            // A. DELEGASI TEGANGAN SUMBER
            CircuitStore.components.forEach(comp => {
                if (comp.applyFixedVoltage) comp.applyFixedVoltage(this, fixedNodes, i);
            });

            // B. DELEGASI RUMUS MATRIKS KIRCHHOFF
            CircuitStore.components.forEach(comp => {
                if (comp.injectMatrix) comp.injectMatrix(this, sumVR, sum1R, i);
            });

            // C. RELAKSASI GAUSS-SEIDEL (ENGINE INTI)
            for (let n = 0; n < this.nodes.length; n++) {
                if (sum1R[n] > 0 && !fixedNodes[n]) { 
                    const newVal = sumVR[n] / sum1R[n];
                    const blendedVal = (this.nodeVoltage[n] * 0.5) + (newVal * 0.5);
                    const diff = Math.abs(blendedVal - this.nodeVoltage[n]);
                    if (diff > maxError) maxError = diff;
                    this.nodeVoltage[n] = blendedVal;
                }
            }

            // D. DETEKSI STAGNASI (Pencegah Lag / Osilasi)
            if (maxError < EPSILON) break; 
            if (Math.abs(maxError - lastError) < EPSILON * 0.1) {
                stagnationCount++;
                if (stagnationCount >= 8) break;
            } else {
                stagnationCount = 0;
            }
            lastError = maxError;
        }

        // E. DELEGASI BACA HASIL
        CircuitStore.components.forEach(comp => {
            if (comp.applyResults) comp.applyResults(this);
        });
    },

    // -----------------------------------------------------------------
    // FASE 1: PEMBANGUNAN NODE KELISTRIKAN
    // -----------------------------------------------------------------
    buildElectricalNodes() {
        this.nodes = [];
        this.nodeVoltage = [];
        
        const adjList = {};
        const getPinId = (compId, type, pinIndex) => `${compId}-${type}-${pinIndex}`;
        
        const addEdge = (pin1, pin2) => {
            if (!adjList[pin1]) adjList[pin1] = new Set();
            if (!adjList[pin2]) adjList[pin2] = new Set();
            adjList[pin1].add(pin2);
            adjList[pin2].add(pin1);
        };

        // Baca koneksi dari CircuitStore
        if (CircuitStore.connections) {
            CircuitStore.connections.forEach(conn => {
                const sType = conn.source.type || 'output';
                const tType = conn.target.type || 'input';
            
            const srcId = getPinId(conn.source.compId, sType, conn.source.pinIndex);
            const tgtId = getPinId(conn.target.compId, tType, conn.target.pinIndex);
            addEdge(srcId, tgtId);
        });
    }
        // Gabungkan pin-pin internal komponen wire/junction
        if (CircuitStore.components) {
            CircuitStore.components.forEach(comp => {
                if (comp.type === 'wire_1to1' || comp.type === 'wire_1to2' || comp.type === 'junction' || comp.type === 'wire_node') {
                    const pins = [];
                    for (let i = 0; i < (comp.inputs || 0); i++) pins.push(getPinId(comp.id, 'input', i));
                    for (let i = 0; i < (comp.outputs || 0); i++) pins.push(getPinId(comp.id, 'output', i));
                    
                    for (let i = 0; i < pins.length - 1; i++) {
                        addEdge(pins[i], pins[i+1]);
                    }
                }
            });
        }
        // Graph Traversal untuk mengelompokkan node
        const visited = new Set();
        
        for (const pin in adjList) {
            if (!visited.has(pin)) {
                const nodeGroup = [];
                const queue = [pin];
                visited.add(pin);
                
                while (queue.length > 0) {
                    const currentPin = queue.shift();
                    nodeGroup.push(currentPin);
                    
                    adjList[currentPin].forEach(neighbor => {
                        if (!visited.has(neighbor)) {
                            visited.add(neighbor);
                            queue.push(neighbor);
                        }
                    });
                }
                
                this.nodes.push(nodeGroup);
                this.nodeVoltage.push(0);
            }
        }
    },

    // -----------------------------------------------------------------
    // HELPER & UTILITIES
    // -----------------------------------------------------------------
    updateInputStates(comp) {
        if (!comp.inputStates) comp.inputStates = new Array(comp.inputs).fill(0);
        
        if (comp.inputs > 0) {
            for (let i = 0; i < comp.inputs; i++) {
                const conn = CircuitStore.connections.find(c => c.target.compId === comp.id && Number(c.target.pinIndex) === i);
                
                if (conn) {
                    const srcComp = CircuitStore.components.find(c => c.id === conn.source.compId);
                    if (srcComp) {
                        const logicTypes = ['switch', 'and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor', 'clock_pulse', 'ff_sr', 'ff_d', 'ff_jk', 'ff_t'];
                        
                        // Cek jika sumber terhubung langsung tanpa perantara ke output IC lain
                        if (logicTypes.includes(srcComp.type) && Number(conn.source.pinIndex) === 0) {
                            comp.inputStates[i] = srcComp.outputState === 1 ? 1 : 0;
                        } 
                        else if (logicTypes.includes(srcComp.type) && Number(conn.source.pinIndex) === 1) {
                            comp.inputStates[i] = srcComp.outputState === 1 ? 0 : 1;
                        }
                        else {
                            // Cerdas: Jangan menebak pin sumber. Baca langsung tegangan di pin INPUT kita sendiri!
                            // Ini menyelesaikan masalah hilangnya sinyal jika melewati junction atau wire.
                            const myPinId = `${comp.id}-input-${i}`;
                            const nIdx = this.nodes.findIndex(group => group.includes(myPinId));
                            const voltage = nIdx !== -1 ? this.nodeVoltage[nIdx] : 0;
                            comp.inputStates[i] = voltage > 2.5 ? 1 : 0; 
                        }
                    }
                } else {
                    comp.inputStates[i] = 0; 
                }
            }
        }
    },

    updateVisuals() {
        CircuitStore.components.forEach(comp => {
            const contentDiv = document.getElementById(`content-${comp.id}`);
            if (contentDiv && typeof ComponentDefs !== 'undefined') {
                ComponentDefs.updateDOMState(comp.type, comp, contentDiv, comp.id);
            }
        });
    }
};