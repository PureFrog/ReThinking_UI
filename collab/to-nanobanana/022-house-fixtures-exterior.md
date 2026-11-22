# 022 나노바나나 요청: 벽 위 창문·수납장 떼어 내기, 외벽 색 바꾸기

- 요청일: 2026-11-09
- 요청자: Claude
- 왜 나노바나나: 두 작업 모두 이미 있는 집 그림을 **그대로 두고 일부만 바꾸는** 편집이야. 창문 위치와 집 모양이 1px도 움직이면 안 돼서 GPT보다 나노바나나가 맞아.
- 만들 그림: 7장 (A 3장, B 4장)

## 보내는 방법

1. 입력 그림은 Claude가 투명 배경을 단색 마젠타(`#FF00FF`)로 채워서 `022-refs/`에 넣어 뒀어.
2. 아래 표 순서대로 **입력 그림 한 장 + 프롬프트 하나**를 나노바나나에 넣어. A 프롬프트는 3번, B 프롬프트는 색마다 2번씩 같은 걸 쓰면 돼.
3. 결과는 받은 그대로 `public/assets/incoming/022-nb/`에 표의 파일 이름으로 저장해.
4. Claude는 배경 마젠타를 빼고 원래 캔버스 크기로 비율 그대로 맞추기만 해. 그림 자체는 고치지 않아.

## 왜 필요한가

꾸미기에서 벽지를 바르면 벽 한 면 전체가 벽지 그림으로 덮여. 그러면 원래 집 그림의 벽에 붙어 있던 창문, 부엌 수납장, 후드가 가려져 (`now_wallpaper_hides_windows.png`: 부엌 분홍 벽지에 창문·수납장이 사라짐). 벽에 붙은 것만 따로 떼어 낸 그림이 있으면 벽지 위에 다시 올릴 수 있어.

외벽 바꾸기는 집 바깥 그림을 색만 다르게 한 벌 더 갖고 있다가 통째로 바꿔 끼우는 방식이야.

## A. 벽에 붙은 것만 남기기 (3장)

| 순서 | 입력 | 결과 파일 이름 | 남길 것 |
| --- | --- | --- | --- |
| A1 | `in_1_floor1_shell.png` | `floor1_wall_fixtures.png` | 왼쪽 벽 창문(커튼·꽃 상자 포함), 뒤쪽 벽의 부엌 수납장 2개, 후드, 뒤쪽 벽 창문(커튼·꽃 상자 포함) |
| A2 | `in_2_floor2_shell.png` | `floor2_wall_fixtures.png` | 창문 3개(커튼 포함) |
| A3 | `in_3_attic_shell.png` | `attic_wall_fixtures.png` | 동그란 창문(둘레 잎 포함) |

**A 프롬프트** (세 장 모두 같은 문장)
```
Erase everything in this picture except the things mounted on the walls: the windows with their frames, curtains and flower boxes, and any wall cabinets and range hood. Replace the walls, the wall trim, the green lower wall panels, the floor, the railing and the stair opening with the same flat solid magenta (#FF00FF) as the background. Keep every remaining object exactly where it is, at exactly the same size, with the same outlines, colors and storybook style. Do not move, crop, rotate, redraw or rescale anything. No shadow on the magenta, no gradient, no text.
```

## B. 외벽 색만 바꾸기 (4장)

| 순서 | 입력 | 결과 파일 이름 | 색 |
| --- | --- | --- | --- |
| B1 | `in_4_house_exterior.png` | `house_exterior_sky.png` | 하늘 |
| B2 | `in_5_house_exterior_grown.png` | `house_exterior_grown_sky.png` | 하늘 |
| B3 | `in_4_house_exterior.png` | `house_exterior_rose.png` | 장미 |
| B4 | `in_5_house_exterior_grown.png` | `house_exterior_grown_rose.png` | 장미 |

**B 프롬프트: 하늘** (B1, B2)
```
Recolor only the cream wall boards of this house to a soft pale sky blue, and only the green roof tiles to a muted slate blue. Keep everything else exactly the same: the wooden trim and corner posts, windows, curtains, flower boxes, door, lamp, chimney, gable, balcony, ivy and stone base keep their current colors. Keep the house in exactly the same position and size with the same outlines and storybook style. Do not move, crop, rotate, redraw or rescale anything. Keep the flat solid magenta (#FF00FF) background, no shadow, no gradient, no text.
```

**B 프롬프트: 장미** (B3, B4)
```
Recolor only the cream wall boards of this house to a soft blush rose pink, and only the green roof tiles to a warm terracotta red. Keep everything else exactly the same: the wooden trim and corner posts, windows, curtains, flower boxes, door, lamp, chimney, gable, balcony, ivy and stone base keep their current colors. Keep the house in exactly the same position and size with the same outlines and storybook style. Do not move, crop, rotate, redraw or rescale anything. Keep the flat solid magenta (#FF00FF) background, no shadow, no gradient, no text.
```

## 받고 나서 확인할 것

- A: 창문을 원래 집 그림에 겹쳐 봤을 때 어긋남이 없어야 해. 어긋나면 그 장만 다시 돌려.
- B: 하늘·장미 각각 작은 집과 큰 집의 색이 같은 톤이어야 해. 다르면 먼저 나온 쪽을 첨부해서 "같은 색으로" 다시 돌려.
- 결과에 마젠타가 아닌 배경(흰색·회색)이 나오면 그 장은 다시 돌려.

## 하지 말 것

- 창문 모양·크기를 새로 그리기
- 지붕·벽 말고 다른 부분 색 바꾸기
- 그림자, 글자, 배경 그라데이션
