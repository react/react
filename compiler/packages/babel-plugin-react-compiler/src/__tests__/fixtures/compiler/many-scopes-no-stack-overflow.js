// Test that the compiler handles components with many sequential reactive scopes.
// This exercises the iterative (non-recursive) fallthrough traversal in
// BuildReactiveFunction. Previously, each scope's fallthrough was visited via
// a recursive call, causing stack overflow (SIGSEGV) on inputs with hundreds
// of scopes.

function ManyScopes(props) {
  const t0 = props.items[0];
  const t1 = props.items[1];
  const t2 = props.items[2];
  const t3 = props.items[3];
  const t4 = props.items[4];
  const t5 = props.items[5];
  const t6 = props.items[6];
  const t7 = props.items[7];
  const t8 = props.items[8];
  const t9 = props.items[9];
  const t10 = props.items[10];
  const t11 = props.items[11];
  const t12 = props.items[12];
  const t13 = props.items[13];
  const t14 = props.items[14];
  const t15 = props.items[15];
  const t16 = props.items[16];
  const t17 = props.items[17];
  const t18 = props.items[18];
  const t19 = props.items[19];
  const t20 = props.items[20];
  const t21 = props.items[21];
  const t22 = props.items[22];
  const t23 = props.items[23];
  const t24 = props.items[24];
  const t25 = props.items[25];
  const t26 = props.items[26];
  const t27 = props.items[27];
  const t28 = props.items[28];
  const t29 = props.items[29];
  const t30 = props.items[30];
  const t31 = props.items[31];
  const t32 = props.items[32];
  const t33 = props.items[33];
  const t34 = props.items[34];
  const t35 = props.items[35];
  const t36 = props.items[36];
  const t37 = props.items[37];
  const t38 = props.items[38];
  const t39 = props.items[39];
  const t40 = props.items[40];
  const t41 = props.items[41];
  const t42 = props.items[42];
  const t43 = props.items[43];
  const t44 = props.items[44];
  const t45 = props.items[45];
  const t46 = props.items[46];
  const t47 = props.items[47];
  const t48 = props.items[48];
  const t49 = props.items[49];
  const t50 = props.items[50];
  const t51 = props.items[51];
  const t52 = props.items[52];
  const t53 = props.items[53];
  const t54 = props.items[54];
  const t55 = props.items[55];
  const t56 = props.items[56];
  const t57 = props.items[57];
  const t58 = props.items[58];
  const t59 = props.items[59];
  const t60 = props.items[60];
  const t61 = props.items[61];
  const t62 = props.items[62];
  const t63 = props.items[63];
  const t64 = props.items[64];
  const t65 = props.items[65];
  const t66 = props.items[66];
  const t67 = props.items[67];
  const t68 = props.items[68];
  const t69 = props.items[69];
  const t70 = props.items[70];
  const t71 = props.items[71];
  const t72 = props.items[72];
  const t73 = props.items[73];
  const t74 = props.items[74];
  const t75 = props.items[75];
  const t76 = props.items[76];
  const t77 = props.items[77];
  const t78 = props.items[78];
  const t79 = props.items[79];
  const t80 = props.items[80];
  const t81 = props.items[81];
  const t82 = props.items[82];
  const t83 = props.items[83];
  const t84 = props.items[84];
  const t85 = props.items[85];
  const t86 = props.items[86];
  const t87 = props.items[87];
  const t88 = props.items[88];
  const t89 = props.items[89];
  const t90 = props.items[90];
  const t91 = props.items[91];
  const t92 = props.items[92];
  const t93 = props.items[93];
  const t94 = props.items[94];
  const t95 = props.items[95];
  const t96 = props.items[96];
  const t97 = props.items[97];
  const t98 = props.items[98];
  const t99 = props.items[99];
  const t100 = props.items[100];
  const t101 = props.items[101];
  const t102 = props.items[102];
  const t103 = props.items[103];
  const t104 = props.items[104];
  const t105 = props.items[105];
  const t106 = props.items[106];
  const t107 = props.items[107];
  const t108 = props.items[108];
  const t109 = props.items[109];
  const t110 = props.items[110];
  const t111 = props.items[111];
  const t112 = props.items[112];
  const t113 = props.items[113];
  const t114 = props.items[114];
  const t115 = props.items[115];
  const t116 = props.items[116];
  const t117 = props.items[117];
  const t118 = props.items[118];
  const t119 = props.items[119];
  const t120 = props.items[120];
  const t121 = props.items[121];
  const t122 = props.items[122];
  const t123 = props.items[123];
  const t124 = props.items[124];
  const t125 = props.items[125];
  const t126 = props.items[126];
  const t127 = props.items[127];
  const t128 = props.items[128];
  const t129 = props.items[129];
  const t130 = props.items[130];
  const t131 = props.items[131];
  const t132 = props.items[132];
  const t133 = props.items[133];
  const t134 = props.items[134];
  const t135 = props.items[135];
  const t136 = props.items[136];
  const t137 = props.items[137];
  const t138 = props.items[138];
  const t139 = props.items[139];
  const t140 = props.items[140];
  const t141 = props.items[141];
  const t142 = props.items[142];
  const t143 = props.items[143];
  const t144 = props.items[144];
  const t145 = props.items[145];
  const t146 = props.items[146];
  const t147 = props.items[147];
  const t148 = props.items[148];
  const t149 = props.items[149];
  const t150 = props.items[150];
  const t151 = props.items[151];
  const t152 = props.items[152];
  const t153 = props.items[153];
  const t154 = props.items[154];
  const t155 = props.items[155];
  const t156 = props.items[156];
  const t157 = props.items[157];
  const t158 = props.items[158];
  const t159 = props.items[159];
  const t160 = props.items[160];
  const t161 = props.items[161];
  const t162 = props.items[162];
  const t163 = props.items[163];
  const t164 = props.items[164];
  const t165 = props.items[165];
  const t166 = props.items[166];
  const t167 = props.items[167];
  const t168 = props.items[168];
  const t169 = props.items[169];
  const t170 = props.items[170];
  const t171 = props.items[171];
  const t172 = props.items[172];
  const t173 = props.items[173];
  const t174 = props.items[174];
  const t175 = props.items[175];
  const t176 = props.items[176];
  const t177 = props.items[177];
  const t178 = props.items[178];
  const t179 = props.items[179];
  const t180 = props.items[180];
  const t181 = props.items[181];
  const t182 = props.items[182];
  const t183 = props.items[183];
  const t184 = props.items[184];
  const t185 = props.items[185];
  const t186 = props.items[186];
  const t187 = props.items[187];
  const t188 = props.items[188];
  const t189 = props.items[189];
  const t190 = props.items[190];
  const t191 = props.items[191];
  const t192 = props.items[192];
  const t193 = props.items[193];
  const t194 = props.items[194];
  const t195 = props.items[195];
  const t196 = props.items[196];
  const t197 = props.items[197];
  const t198 = props.items[198];
  const t199 = props.items[199];
  const t200 = props.items[200];
  const t201 = props.items[201];
  const t202 = props.items[202];
  const t203 = props.items[203];
  const t204 = props.items[204];
  const t205 = props.items[205];
  const t206 = props.items[206];
  const t207 = props.items[207];
  const t208 = props.items[208];
  const t209 = props.items[209];
  const t210 = props.items[210];
  const t211 = props.items[211];
  const t212 = props.items[212];
  const t213 = props.items[213];
  const t214 = props.items[214];
  const t215 = props.items[215];
  const t216 = props.items[216];
  const t217 = props.items[217];
  const t218 = props.items[218];
  const t219 = props.items[219];
  const t220 = props.items[220];
  const t221 = props.items[221];
  const t222 = props.items[222];
  const t223 = props.items[223];
  const t224 = props.items[224];
  const t225 = props.items[225];
  const t226 = props.items[226];
  const t227 = props.items[227];
  const t228 = props.items[228];
  const t229 = props.items[229];
  const t230 = props.items[230];
  const t231 = props.items[231];
  const t232 = props.items[232];
  const t233 = props.items[233];
  const t234 = props.items[234];
  const t235 = props.items[235];
  const t236 = props.items[236];
  const t237 = props.items[237];
  const t238 = props.items[238];
  const t239 = props.items[239];
  const t240 = props.items[240];
  const t241 = props.items[241];
  const t242 = props.items[242];
  const t243 = props.items[243];
  const t244 = props.items[244];
  const t245 = props.items[245];
  const t246 = props.items[246];
  const t247 = props.items[247];
  const t248 = props.items[248];
  const t249 = props.items[249];
  const t250 = props.items[250];
  const t251 = props.items[251];
  const t252 = props.items[252];
  const t253 = props.items[253];
  const t254 = props.items[254];
  const t255 = props.items[255];
  const t256 = props.items[256];
  const t257 = props.items[257];
  const t258 = props.items[258];
  const t259 = props.items[259];
  const t260 = props.items[260];
  const t261 = props.items[261];
  const t262 = props.items[262];
  const t263 = props.items[263];
  const t264 = props.items[264];
  const t265 = props.items[265];
  const t266 = props.items[266];
  const t267 = props.items[267];
  const t268 = props.items[268];
  const t269 = props.items[269];
  const t270 = props.items[270];
  const t271 = props.items[271];
  const t272 = props.items[272];
  const t273 = props.items[273];
  const t274 = props.items[274];
  const t275 = props.items[275];
  const t276 = props.items[276];
  const t277 = props.items[277];
  const t278 = props.items[278];
  const t279 = props.items[279];
  const t280 = props.items[280];
  const t281 = props.items[281];
  const t282 = props.items[282];
  const t283 = props.items[283];
  const t284 = props.items[284];
  const t285 = props.items[285];
  const t286 = props.items[286];
  const t287 = props.items[287];
  const t288 = props.items[288];
  const t289 = props.items[289];
  const t290 = props.items[290];
  const t291 = props.items[291];
  const t292 = props.items[292];
  const t293 = props.items[293];
  const t294 = props.items[294];
  const t295 = props.items[295];
  const t296 = props.items[296];
  const t297 = props.items[297];
  const t298 = props.items[298];
  const t299 = props.items[299];
  const t300 = props.items[300];
  const t301 = props.items[301];
  const t302 = props.items[302];
  const t303 = props.items[303];
  const t304 = props.items[304];
  const t305 = props.items[305];
  const t306 = props.items[306];
  const t307 = props.items[307];
  const t308 = props.items[308];
  const t309 = props.items[309];
  const t310 = props.items[310];
  const t311 = props.items[311];
  const t312 = props.items[312];
  const t313 = props.items[313];
  const t314 = props.items[314];
  const t315 = props.items[315];
  const t316 = props.items[316];
  const t317 = props.items[317];
  const t318 = props.items[318];
  const t319 = props.items[319];
  const t320 = props.items[320];
  const t321 = props.items[321];
  const t322 = props.items[322];
  const t323 = props.items[323];
  const t324 = props.items[324];
  const t325 = props.items[325];
  const t326 = props.items[326];
  const t327 = props.items[327];
  const t328 = props.items[328];
  const t329 = props.items[329];
  const t330 = props.items[330];
  const t331 = props.items[331];
  const t332 = props.items[332];
  const t333 = props.items[333];
  const t334 = props.items[334];
  const t335 = props.items[335];
  const t336 = props.items[336];
  const t337 = props.items[337];
  const t338 = props.items[338];
  const t339 = props.items[339];
  const t340 = props.items[340];
  const t341 = props.items[341];
  const t342 = props.items[342];
  const t343 = props.items[343];
  const t344 = props.items[344];
  const t345 = props.items[345];
  const t346 = props.items[346];
  const t347 = props.items[347];
  const t348 = props.items[348];
  const t349 = props.items[349];
  const t350 = props.items[350];
  const t351 = props.items[351];
  const t352 = props.items[352];
  const t353 = props.items[353];
  const t354 = props.items[354];
  const t355 = props.items[355];
  const t356 = props.items[356];
  const t357 = props.items[357];
  const t358 = props.items[358];
  const t359 = props.items[359];
  const t360 = props.items[360];
  const t361 = props.items[361];
  const t362 = props.items[362];
  const t363 = props.items[363];
  const t364 = props.items[364];
  const t365 = props.items[365];
  const t366 = props.items[366];
  const t367 = props.items[367];
  const t368 = props.items[368];
  const t369 = props.items[369];
  const t370 = props.items[370];
  const t371 = props.items[371];
  const t372 = props.items[372];
  const t373 = props.items[373];
  const t374 = props.items[374];
  const t375 = props.items[375];
  const t376 = props.items[376];
  const t377 = props.items[377];
  const t378 = props.items[378];
  const t379 = props.items[379];
  const t380 = props.items[380];
  const t381 = props.items[381];
  const t382 = props.items[382];
  const t383 = props.items[383];
  const t384 = props.items[384];
  const t385 = props.items[385];
  const t386 = props.items[386];
  const t387 = props.items[387];
  const t388 = props.items[388];
  const t389 = props.items[389];
  const t390 = props.items[390];
  const t391 = props.items[391];
  const t392 = props.items[392];
  const t393 = props.items[393];
  const t394 = props.items[394];
  const t395 = props.items[395];
  const t396 = props.items[396];
  const t397 = props.items[397];
  const t398 = props.items[398];
  const t399 = props.items[399];
  return [
    t0,
    t1,
    t2,
    t3,
    t4,
    t5,
    t6,
    t7,
    t8,
    t9,
    t10,
    t11,
    t12,
    t13,
    t14,
    t15,
    t16,
    t17,
    t18,
    t19,
    t20,
    t21,
    t22,
    t23,
    t24,
    t25,
    t26,
    t27,
    t28,
    t29,
    t30,
    t31,
    t32,
    t33,
    t34,
    t35,
    t36,
    t37,
    t38,
    t39,
    t40,
    t41,
    t42,
    t43,
    t44,
    t45,
    t46,
    t47,
    t48,
    t49,
    t50,
    t51,
    t52,
    t53,
    t54,
    t55,
    t56,
    t57,
    t58,
    t59,
    t60,
    t61,
    t62,
    t63,
    t64,
    t65,
    t66,
    t67,
    t68,
    t69,
    t70,
    t71,
    t72,
    t73,
    t74,
    t75,
    t76,
    t77,
    t78,
    t79,
    t80,
    t81,
    t82,
    t83,
    t84,
    t85,
    t86,
    t87,
    t88,
    t89,
    t90,
    t91,
    t92,
    t93,
    t94,
    t95,
    t96,
    t97,
    t98,
    t99,
    t100,
    t101,
    t102,
    t103,
    t104,
    t105,
    t106,
    t107,
    t108,
    t109,
    t110,
    t111,
    t112,
    t113,
    t114,
    t115,
    t116,
    t117,
    t118,
    t119,
    t120,
    t121,
    t122,
    t123,
    t124,
    t125,
    t126,
    t127,
    t128,
    t129,
    t130,
    t131,
    t132,
    t133,
    t134,
    t135,
    t136,
    t137,
    t138,
    t139,
    t140,
    t141,
    t142,
    t143,
    t144,
    t145,
    t146,
    t147,
    t148,
    t149,
    t150,
    t151,
    t152,
    t153,
    t154,
    t155,
    t156,
    t157,
    t158,
    t159,
    t160,
    t161,
    t162,
    t163,
    t164,
    t165,
    t166,
    t167,
    t168,
    t169,
    t170,
    t171,
    t172,
    t173,
    t174,
    t175,
    t176,
    t177,
    t178,
    t179,
    t180,
    t181,
    t182,
    t183,
    t184,
    t185,
    t186,
    t187,
    t188,
    t189,
    t190,
    t191,
    t192,
    t193,
    t194,
    t195,
    t196,
    t197,
    t198,
    t199,
    t200,
    t201,
    t202,
    t203,
    t204,
    t205,
    t206,
    t207,
    t208,
    t209,
    t210,
    t211,
    t212,
    t213,
    t214,
    t215,
    t216,
    t217,
    t218,
    t219,
    t220,
    t221,
    t222,
    t223,
    t224,
    t225,
    t226,
    t227,
    t228,
    t229,
    t230,
    t231,
    t232,
    t233,
    t234,
    t235,
    t236,
    t237,
    t238,
    t239,
    t240,
    t241,
    t242,
    t243,
    t244,
    t245,
    t246,
    t247,
    t248,
    t249,
    t250,
    t251,
    t252,
    t253,
    t254,
    t255,
    t256,
    t257,
    t258,
    t259,
    t260,
    t261,
    t262,
    t263,
    t264,
    t265,
    t266,
    t267,
    t268,
    t269,
    t270,
    t271,
    t272,
    t273,
    t274,
    t275,
    t276,
    t277,
    t278,
    t279,
    t280,
    t281,
    t282,
    t283,
    t284,
    t285,
    t286,
    t287,
    t288,
    t289,
    t290,
    t291,
    t292,
    t293,
    t294,
    t295,
    t296,
    t297,
    t298,
    t299,
    t300,
    t301,
    t302,
    t303,
    t304,
    t305,
    t306,
    t307,
    t308,
    t309,
    t310,
    t311,
    t312,
    t313,
    t314,
    t315,
    t316,
    t317,
    t318,
    t319,
    t320,
    t321,
    t322,
    t323,
    t324,
    t325,
    t326,
    t327,
    t328,
    t329,
    t330,
    t331,
    t332,
    t333,
    t334,
    t335,
    t336,
    t337,
    t338,
    t339,
    t340,
    t341,
    t342,
    t343,
    t344,
    t345,
    t346,
    t347,
    t348,
    t349,
    t350,
    t351,
    t352,
    t353,
    t354,
    t355,
    t356,
    t357,
    t358,
    t359,
    t360,
    t361,
    t362,
    t363,
    t364,
    t365,
    t366,
    t367,
    t368,
    t369,
    t370,
    t371,
    t372,
    t373,
    t374,
    t375,
    t376,
    t377,
    t378,
    t379,
    t380,
    t381,
    t382,
    t383,
    t384,
    t385,
    t386,
    t387,
    t388,
    t389,
    t390,
    t391,
    t392,
    t393,
    t394,
    t395,
    t396,
    t397,
    t398,
    t399,
  ];
}
