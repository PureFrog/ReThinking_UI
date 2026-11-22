# 012-nb 나노바나나 요청: 나무 상태 변형 (GPT 012 기본 나무 15장을 받은 뒤)

- 요청일: 2026-11-03, 보냄 2026-11-04 (GPT 012 나무 15장 도착). 실제로 따라 할 목록은 `012-nb-checklist.md`
- 요청자: Claude
- 왜 나노바나나: 이미 있는 나무 그림을 **그대로 두고 상태만 바꾸는** 변형 작업이라서. 나무 모양·위치·외곽선이 그대로 남아야 한다.

## 보내는 방법

1. Claude가 GPT 나무 15장을 단색 배경(마젠타 `#FF00FF`, 분홍 나무인 종류 1은 하늘색 `#00E5FF`) 위에 올려 `012-nb-inputs/`에 둔다.
2. 사용자는 입력 그림 한 장과 아래 프롬프트 하나를 나노바나나에 넣는다. 한 번에 하나씩.
3. 결과는 받은 그대로 `public/assets/incoming/012-nb/`에 `tree_<종류>_<단계>_<상태>.png` 이름으로 저장한다.
4. Claude는 배경 단색을 빼고 512×512로 비율 그대로 줄인다. 그림 자체는 고치지 않는다.

## 만들 변형 (종류마다 20장, 모두 60장)

| 단계 | 만들 상태 |
| --- | --- |
| `seed` | `wilt`, `dead` |
| `sprout` | `dull`, `wilt`, `dead` |
| `sapling`, `young`, `grand` | `bloom`, `dull`, `wilt`, `rot`, `dead` |

## 공통으로 붙이는 문장 (모든 프롬프트 끝에)

```
Keep the exact same tree: same position, same size, same trunk base location, same outline thickness, same storybook art style and lighting from the upper left. Do not move, crop, rotate or rescale anything. Keep the background the exact same flat solid color, with no shadow on it, no gradient, no text.
```

## 상태별 프롬프트

**bloom** (열매가 익음, +10% 이상)
```
Edit this tree so its fruits are fully ripe, plump and slightly larger, with fresh glossy leaves. Do not add glow or sparkles.
```

**dull** (잎끝이 누레짐, 0 ~ -10%)
```
Edit this tree so about a third of the leaves turn yellowish at the tips, the green is a little paler, and one or two yellow leaves lie on the ground at the base. The fruits look a bit dull. The tree still stands straight.
```

**wilt** (시들어 잎이 떨어짐, -10% 미만)
```
Edit this tree so it is wilting: most leaves are orange and brown and curled, the foliage is thinner with gaps, branches droop slightly, fruits are shriveled and smaller, and several dry leaves are scattered on the ground around the base.
```

**rot** (가지가 썩어 감, -20% 이하 30일~)
```
Edit this tree so it is rotting: only a few brown dry leaves remain, the bark has dark soft rotten patches, one branch is snapped and hanging, small brown mushrooms grow at the base, fruits have fallen and lie rotting on the ground.
```

**dead** (말라 죽은 그루터기, -20% 이하 60일~)
```
Edit this tree into a dead rotten stump of the same trunk: the trunk is broken off low with jagged splintered top, hollow and dark inside, peeling grey-brown bark, moss and small mushrooms at the base, a few fallen twigs and brown leaves around it. No leaves on it at all.
```

씨앗·새싹 단계에서는 문장을 이렇게 바꾼다:
- seed `wilt`: `Edit this so the soil mound is dry and cracked and the tiny sprout tip is brown and drooping.`
- seed `dead`: `Edit this so the soil mound is dry, pale and cracked and the seed is shriveled and grey, with no green at all.`
- sprout `dull`: `Edit this sprout so its leaves are yellowing at the edges.`
- sprout `wilt`: `Edit this sprout so it droops over, leaves curled and brown at the edges.`
- sprout `dead`: `Edit this sprout so it is dried out, bent to the ground, leaves brown and crumbling.`
