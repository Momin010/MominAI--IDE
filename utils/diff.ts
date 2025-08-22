
import type { DiffLine } from '../types';

/**
 * A simple implementation of a diffing algorithm based on Longest Common Subsequence (LCS).
 * It's not the most efficient (Myers diff is better) but it's simple and effective for this use case.
 */
export const generateDiff = (text1: string, text2: string): DiffLine[] => {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    
    const m = lines1.length;
    const n = lines2.length;
    const lcs = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (lines1[i - 1] === lines2[j - 1]) {
                lcs[i][j] = lcs[i - 1][j - 1] + 1;
            } else {
                lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
            }
        }
    }

    const diff: DiffLine[] = [];
    let i = m, j = n;
    let lineNumber = Math.max(m, n);

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
            diff.unshift({ type: 'unchanged', content: lines1[i - 1], lineNumber });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
            diff.unshift({ type: 'added', content: lines2[j - 1], lineNumber });
            j--;
        } else if (i > 0 && (j === 0 || lcs[i][j - 1] < lcs[i - 1][j])) {
            diff.unshift({ type: 'removed', content: lines1[i - 1], lineNumber });
            i--;
        }
        lineNumber = Math.max(i, j);
    }

    // This basic diff doesn't show line numbers perfectly, so we'll re-calculate them.
    let lineCounter = 1;
    return diff.map(line => {
        const result = { ...line, lineNumber: line.type !== 'removed' ? lineCounter : 0 };
        if (line.type !== 'removed') lineCounter++;
        return result;
    });
};
