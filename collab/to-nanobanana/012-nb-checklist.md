# 012-nb 나노바나나 체크리스트 — 끝남 (2026-11-04, 4묶음으로 마무리. 012-nb-batch 참고)

한 번에 한 장: **입력 그림** 하나를 나노바나나에 올리고 → 아래 프롬프트를 그대로 붙여 넣고 → 나온 그림을 **저장 이름**으로 `public/assets/incoming/012-nb/`에 저장.
입력 그림 폴더: `collab/to-nanobanana/012-nb-inputs/`. 프롬프트는 A(나무 9번)와 B(씨앗·새싹 6번) 두 가지. 같은 종류끼리 이어서 하면 복사를 두 번만 하면 돼.

색은 코드로 바꾸지 않는다. 모든 상태를 그림으로 받는다 (씨앗·새싹 포함). 그림이 오기 전까지는 싱싱한 그림이 그대로 나온다.

## 프롬프트 A: 어린·자란·큰 나무 (1~9번)

```
Using this tree as the base, make ONE image with five versions of the exact same tree, on the same flat solid background color as the input (no gradient, no shadow on the background).
Layout: top row of three, bottom row of two, with clear empty space between them so no two trees touch.
Top row, left to right:
1. WILT: most leaves orange and brown and curled, foliage thinner with gaps, branches droop slightly, fruits shriveled, dry leaves scattered on the ground.
2. ROT: only a few brown dry leaves left, dark soft rotten patches on the bark, one branch snapped and hanging, small brown mushrooms at the base, fallen rotting fruits on the ground.
3. DEAD: the same trunk broken off low into a hollow rotten stump with a jagged splintered top, peeling grey-brown bark, moss and small mushrooms at the base, a few fallen twigs and brown leaves. No leaves on it.
Bottom row, left to right:
4. DULL: about a third of the leaves yellowing at the tips, slightly paler green, fruits a bit dull, one or two yellow leaves on the ground. Still standing straight.
5. BLOOM: fruits fully ripe, plump and glossy, fresh bright leaves. No glow, no sparkles.
Keep the same storybook art style, outline thickness, colors and light from the upper left as the input. Draw every tree the same size as the input tree, standing on an invisible ground line.
Keep every version as bright as the input tree: change leaf colors, never darken or dim the whole picture, no dark or grey overall tone.
Do NOT write any text, labels, file names or numbers anywhere in the image.
```

## 프롬프트 B-1: 씨앗 (10·12·14번)

```
Using this seed mound as the base, make ONE image with two versions side by side, left to right:
1. WILT: the soil mound dry and cracked, the tiny sprout tip brown and drooping.
2. DEAD: the soil pale, dry and cracked, the seed shriveled and grey-brown, no green at all.
Keep the same storybook art style, outline thickness and light from the upper left as the input. Keep every version as bright as the input: change colors of leaves and soil only as described, never darken or dim the whole picture. Same size and same position as the input, on the same flat solid background color (no gradient, no shadow on the background). Clear empty space between versions. Do NOT write any text, labels, file names or numbers anywhere in the image.
```

## 프롬프트 B-2: 새싹 (11·13·15번)

```
Using this sprout as the base, make ONE image with three versions side by side, left to right:
1. DULL: the leaves yellowing at the edges, still standing up.
2. WILT: the sprout drooping over, leaves curled and brown at the edges.
3. DEAD: dried out and bent to the ground, leaves brown and crumbling.
Keep the same storybook art style, outline thickness and light from the upper left as the input. Keep every version as bright as the input: change colors of leaves and soil only as described, never darken or dim the whole picture. Same size and same position as the input, on the same flat solid background color (no gradient, no shadow on the background). Clear empty space between versions. Do NOT write any text, labels, file names or numbers anywhere in the image.
```

## 순서

| # | 입력 그림 | 저장 이름 | 상태 |
| --- | --- | --- | --- |
| 1 | `tree_0_young_well.png` (반도체 칩 나무, young) | `sheet_0_young.png` | 끝남 |
| 2 | `tree_1_young_well.png` (분홍 꽃 나무, young) | `sheet_1_young.png` |  |
| 3 | `tree_2_young_well.png` (별 열매 나무, young) | `sheet_2_young.png` |  |
| 4 | `tree_0_grand_well.png` (반도체 칩 나무, grand) | `sheet_0_grand.png` |  |
| 5 | `tree_1_grand_well.png` (분홍 꽃 나무, grand) | `sheet_1_grand.png` |  |
| 6 | `tree_2_grand_well.png` (별 열매 나무, grand) | `sheet_2_grand.png` |  |
| 7 | `tree_0_sapling_well.png` (반도체 칩 나무, sapling) | `sheet_0_sapling.png` |  |
| 8 | `tree_1_sapling_well.png` (분홍 꽃 나무, sapling) | `sheet_1_sapling.png` |  |
| 9 | `tree_2_sapling_well.png` (별 열매 나무, sapling) | `sheet_2_sapling.png` |  |
| 10 | `tree_0_seed_well.png` (반도체 칩 나무, seed) | `sheet_0_seed.png` | 끝남 |
| 11 | `tree_0_sprout_well.png` (반도체 칩 나무, sprout) | `sheet_0_sprout.png` | 끝남 |
| 12 | `tree_1_seed_well.png` (분홍 꽃 나무, seed) | `sheet_1_seed.png` | |
| 13 | `tree_1_sprout_well.png` (분홍 꽃 나무, sprout) | `sheet_1_sprout.png` | |
| 14 | `tree_2_seed_well.png` (별 열매 나무, seed) | `sheet_2_seed.png` | |
| 15 | `tree_2_sprout_well.png` (별 열매 나무, sprout) | `sheet_2_sprout.png` | |

글자(파일 이름)가 그림에 들어가도 내가 잘라서 버리니까 괜찮아. 다만 나무끼리 붙어 있으면 다시 뽑아 줘.

## 다시: 분홍 나무 young 시듦 한 장

입력 `tree_1_young_well.png` → 저장 `redo_1_young_wilt.png`. 첫 시트의 시듦은 꽃 덩어리가 통째로 사라져서 다른 나무처럼 보였음.

```
Using this tree as the base, make ONE image of the same tree WILTING. Keep the same round, full blossom canopy shape and the same size and position as the input. Change only colors and density: the pink blossoms fade toward pale brownish pink, about half the flowers have fallen so the canopy has small gaps, a few leaves curl orange-brown, the pear-shaped fruits are shriveled and dull, and fallen petals and dry leaves are scattered on the ground around the base. Keep the same storybook art style, outline thickness and light from the upper left. Keep it as bright as the input, never darken or dim the whole picture. Same flat solid background color as the input, no gradient, no shadow on the background. Do NOT write any text, labels, file names or numbers anywhere in the image.
```
