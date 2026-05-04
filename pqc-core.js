// ==================== PARAMÈTRES PQC (LWE/Kyber) ====================
const n = 16;
const q = 3329;
const HALF_Q = Math.floor(q / 2);

// Modulo q
function mod(x) {
    let r = x % q;
    if (r < 0) r += q;
    return r;
}

// Produit scalaire
function dot(a, b) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += a[i] * b[i];
    return sum;
}

function dotMod(a, b) {
    return mod(dot(a, b));
}

// Vecteur aléatoire dans Zq
function randVec() {
    return Array.from({ length: n }, () => Math.floor(Math.random() * q));
}

// Matrice aléatoire n×n
function randMat() {
    return Array.from({ length: n }, () => randVec());
}

// Aᵀ × r
function transposeMul(A, r) {
    const res = new Array(n);
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) sum += A[j][i] * r[j];
        res[i] = mod(sum);
    }
    return res;
}

// Conversion texte ↔ bits
function textToBits(text) {
    const bits = [];
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        for (let b = 7; b >= 0; b--) bits.push((code >> b) & 1);
    }
    return bits;
}

function bitsToText(bits) {
    let result = "";
    for (let i = 0; i < bits.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8 && i + j < bits.length; j++) byte = (byte << 1) | bits[i + j];
        result += String.fromCharCode(byte);
    }
    return result;
}

// Génération paire de clés PQC
function generateKeypair() {
    const sk = randVec();           // clé privée s
    const A = randMat();             // matrice publique A
    const b = new Array(n);          // b = A·s (mod q)
    for (let i = 0; i < n; i++) {
        b[i] = mod(dot(A[i], sk));
    }
    return { sk: sk, pk: { A: A, b: b } };
}

// Chiffrement PQC avec clé publique
function encrypt(message, pk) {
    const bits = textToBits(message);
    const uVecs = [];
    const vVals = [];
    const logs = [];
    
    logs.push(`📝 Message: "${message}" → ${bits.length} bits`);
    
    for (let i = 0; i < bits.length; i++) {
        const bit = bits[i];
        const r = Array.from({ length: n }, () => Math.random() < 0.5 ? 0 : 1);
        
        // u = Aᵀ·r
        const u = transposeMul(pk.A, r);
        
        // v = b·r + m*(q/2)
        const bDotR = dotMod(pk.b, r);
        const encoded = bit === 1 ? HALF_Q : 0;
        const v = mod(bDotR + encoded);
        
        uVecs.push(u);
        vVals.push(v);
        
        if (i < 5) logs.push(`  bit[${i}] = ${bit} → v=${v}`);
    }
    
    logs.push(`✅ Chiffré: ${uVecs.length} blocs`);
    return { ciphertext: { u: uVecs, v: vVals }, logs };
}

// Déchiffrement PQC avec clé privée
function decrypt(ciphertext, sk) {
    const { u: uVecs, v: vVals } = ciphertext;
    const decBits = [];
    const details = [];
    
    for (let i = 0; i < uVecs.length; i++) {
        const u = uVecs[i];
        const v = vVals[i];
        
        // s·u (mod q)
        let sDotU = 0;
        for (let j = 0; j < n; j++) sDotU += sk[j] * u[j];
        sDotU = mod(sDotU);
        
        // m' = v - s·u (mod q)
        const mp = mod(v - sDotU);
        
        // Décision par distance
        const distZero = Math.min(mp, q - mp);
        const distHalf = Math.abs(mp - HALF_Q);
        const bit = (distHalf < distZero) ? 1 : 0;
        
        decBits.push(bit);
        if (i < 5) details.push(`bit[${i}]: v=${v}, s·u=${sDotU}, m'=${mp} → ${bit}`);
    }
    
    const text = bitsToText(decBits);
    return { text, details };
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { n, q, HALF_Q, mod, dot, dotMod, randVec, randMat, transposeMul, textToBits, bitsToText, generateKeypair, encrypt, decrypt };
}