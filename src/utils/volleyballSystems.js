// Volleyball systems and rotation logic based on Google Apps Script
export const VOLLEYBALL_SYSTEMS = {
  "5-1 (OH>S)": ["S", "OH (w.s)", "MB", "Oppo", "OH", "MB (w.s)"],
  "5-1 (MB>S)": ["S", "MB (w.s)", "OH", "Oppo", "MB", "OH (w.s)"],
  "4-2": ["S1", "OH1", "MB1", "S2", "OH2", "MB2"],
  "6-2": ["S1/OPP1", "MB1", "OH1", "S2/OPP2", "MB2", "OH2"]
};

export const POSITION_LABELS = [
  { key: "S", label: "S" },
  { key: "OH_WS", label: "OH (w.s)" },
  { key: "MB", label: "MB" },
  { key: "Oppo", label: "Oppo" },
  { key: "OH", label: "OH" },
  { key: "MB_WS", label: "MB (w.s)" },
  { key: "L", label: "L" }
];

// Make starting order based on which role starts in P1
export const makeStartingOrder = (baseArray, startRole) => {
  const idx = baseArray.indexOf(startRole);
  if (idx < 0) {
    throw new Error(`Invalid start role "${startRole}" not found in [${baseArray.join(', ')}]`);
  }
  return baseArray.slice(idx).concat(baseArray.slice(0, idx));
};

// Generate all 6 rotations with libero substitution logic
export const getRotations = (teamObj, orderArray) => {
  const allRotations = [];
  
  for (let r = 0; r < 6; r++) {
    // Shift by r positions
    const rolesShifted = orderArray.map((_, i) => orderArray[(i + r) % 6]);
    
    // Create occupant objects
    let occupantObjs = rolesShifted.map(role => ({
      role: role,
      name: teamObj[role] || `???(${role})`
    }));
    
    // Libero substitution in back row (positions 0, 4, 5 = P1, P5, P6)
    [0, 4, 5].forEach(pos => {
      const ro = occupantObjs[pos].role;
      if (ro === 'MB' || ro === 'MB (w.s)' || ro === 'MB1' || ro === 'MB2') {
        occupantObjs[pos] = { 
          role: "L", 
          name: teamObj["L"] || "???(L)"
        };
      }
    });
    
    allRotations.push(occupantObjs);
  }
  
  return allRotations;
};

// Convert serving formation to rally formation
export const getRallyLineup = (occupantObjs) => {
  const rally = {};
  
  // Front row positions [1,2,3] (P2, P3, P4)
  [1, 2, 3].forEach(i => {
    const { role, name } = occupantObjs[i];
    if (role.startsWith('MB')) {
      rally.p3 = name; // MB goes to P3 (middle front)
    } else if (role.startsWith('OH')) {
      rally.p4 = name; // OH goes to P4 (left front)
    } else {
      rally.p2 = name; // S/Oppo goes to P2 (right front)
    }
  });
  
  // Back row positions [0,4,5] (P1, P5, P6)
  [0, 4, 5].forEach(i => {
    const { role, name } = occupantObjs[i];
    if (role === 'L') {
      rally.p5 = name; // Libero goes to P5 (left back)
    } else if (role.startsWith('OH')) {
      rally.p6 = name; // OH goes to P6 (middle back)
    } else {
      rally.p1 = name; // S/Oppo goes to P1 (right back)
    }
  });
  
  return [rally.p1, rally.p2, rally.p3, rally.p4, rally.p5, rally.p6];
};

export const DEFAULT_TEAM_CONFIG = {
  teamA: {
    players: {
      S: "Yennie",
      "OH (w.s)": "Alice",
      MB: "Elly",
      Oppo: "Toby",
      OH: "Amei",
      "MB (w.s)": "Venus",
      L: "Ding"
    },
    system: "5-1 (OH>S)",
    startingP1: "OH"
  },
  teamB: {
    players: {
      S: "",
      "OH (w.s)": "",
      MB: "",
      Oppo: "",
      OH: "",
      "MB (w.s)": "",
      L: ""
    },
    system: "5-1 (OH>S)",
    startingP1: "MB (w.s)"
  }
};