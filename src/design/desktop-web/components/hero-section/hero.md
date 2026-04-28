Use `@src\design\desktop-web\components\hero-section\assets` for hero assets.

Assets:
- One FBX containing 2 chess pieces:
	- King with a headphone mic
	- Queen with a handheld mic
- Work with blenderMCP to determine each piece’s pivot directly in Blender.

Hero behavior:
- Start with both models exactly as they appear in the FBX, centered in the hero section. The model and the texture are in `@src\design\desktop-web\components\hero-section\assets\models\chess pieces`
- Add subtle idle animations for both pieces and their accessories.
- On scroll down, separate the pieces:
	- King moves left
	- Queen moves right
	- Queen scales up and shifts to the king’s depth so both remain visually the same size
- By the time the next section’s “trusted” area is reached, the king and queen should flank it.
- On scroll back up, return both pieces to their original position and orientation.
- After scrolling past “trusted” and into the voice cards section, move both pieces toward the screen edges so they are fully out of view by the time the cards are fully visible.

Video frame behavior:
- Render a constant stream of paused video frames randomly across the hero section.
- Each frame should move inward toward the screen and fade out over time.
- On hover on a video frame:
	- Pause the stream
	- Play the matching video
	- Play the matching mock commentary audio
- Put real commentary audio files in `src\design\desktop-web\components\hero-section\assets\commentations`
- Put video files in `src\design\desktop-web\components\hero-section\assets\videos`
- Match files by name so each video maps to its audio.
- Make the implementation ready for integration when the files are added.
- For now, reuse the same video and audio file for all frames.

Reference:
- Match the model appearance in `@src\design\desktop-web\components\hero-section\ref.png`
