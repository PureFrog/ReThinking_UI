# 022 다시 돌릴 것 (창문 3장)

외벽은 받은 장미 2장(작은 집, 큰 집)만 쓰기로 했어. 하늘색은 안 만들어.
창문만 다시 돌리면 돼. 벽지를 발라도 창문과 수납장이 보이게 벽지 위에 다시 올릴 그림이야.

| 번호 | 받은 것의 문제 |
| --- | --- |
| 1 | 1층: 창문·수납장 위치는 맞는데 바닥이 남아 있음 |
| 2 | 2층: 창문이 5개로 늘어남, 바닥도 남음 |
| 3 | 다락: 방이 거의 그대로고 큰 창문이 하나 더 생김 |

각 번호마다 입력 그림 한 장과 프롬프트 하나를 넣으면 돼. 입력 그림은 `022-followup-refs/`에 번호대로 있어.

## 1. 1층: 바닥만 지우기

입력: `1_fix_floor1_result.png` (방금 받은 1층 결과)
```
Erase the wooden floor, the tiled floor and the floor's front edge, filling them with the same flat solid magenta (#FF00FF) as the background. Keep the two windows, the two wall cabinets and the range hood exactly as they are: same position, same size, same pixels. Do not move, crop, rotate, redraw or rescale anything. No shadow, no gradient, no text.
```

## 2. 2층: 창문 3개만 남기기

입력: `2_floor2_shell.png`
```
This room has exactly three windows: one on the left wall and two on the right wall. Keep only those three windows with their frames and curtains, exactly where they are, at exactly the same size. Erase everything else to the same flat solid magenta (#FF00FF) as the background: the walls, the wall trim, the green lower wall panels, the floor, the railing and the stair opening. Do not add, copy or duplicate any window. Do not move, crop, rotate, redraw or rescale anything. No shadow, no gradient, no text.
```

## 3. 다락: 동그란 창문 하나만 남기기

입력: `3_attic_shell.png`
```
Keep only the one small round window on the left wall, exactly where it is, at exactly the same size, with the leaves seen through it. Erase everything else to the same flat solid magenta (#FF00FF) as the background: the walls, the roof beams, the green lower wall panels, the floor, the railing and the stair hole. Do not draw a second window and do not enlarge the window. Do not move, crop, rotate, redraw or rescale anything. No shadow, no gradient, no text.
```
