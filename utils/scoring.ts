
// --- MATH LOGIC: Inverse Efficiency Model (Hyperbola) ---
// S = K / (T + (E * P) + 1)
export const calculateScore = (time: number, errors: number, difficulty: number) => {
    // K (Maximum Constant): Scales with difficulty.
    const K = difficulty * 10000;
    
    // P (Penalty): 10 seconds per error.
    const P = 10;
    
    const cost = time + (errors * P) + 1;
    const score = Math.round(K / cost);
    return score;
};
