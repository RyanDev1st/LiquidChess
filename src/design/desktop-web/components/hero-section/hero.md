Use @src\design\desktop-web\components\hero-section\assets for the hero section assets.

The assets include:
- An FBX file of 2 chess pieces: a king with a headphone with a mic and a queen with a hand held mic. You should work with blender to discern the pivot of the pieces separately. 

The hero section will start with the 2 models, with exact position and orientation as in the FBX file. 

This stands in the middle of the hero section. With subtle idle animations for both pieces and their accessories. 

As the user scrolls down, the pieces will slowly move apart from each other, with the king moving to the left and the queen moving to the right. The queen should scale up and moved to the same depth as the king so they remain the same size. By the time they scroll down to the next section which is the voice showcase, the 2 pieces should flank the "trusted" part of the voice showcase section, with the king on the left and the queen on the right. Then when the user scrolls back up to the hero section, the pieces should move back to their original position and orientation.

When the user scroll past the "trusted" part to the voice cards, the pieces should move to the edge of the screen and by the time the voice cards section is in full view, the pieces should be out of the screen.

The hero section should have a constant stream of video frames (paused) moving inwards towards the screen with each slowly disappear as they move inwards and disappear. If you hover your mouse on one video frame, pause the stream and play that video with the mock commentating audio playing. 

the real commentating audio will be put in src\design\desktop-web\components\hero-section\assets\commentations and the videos will be put in src\design\desktop-web\components\hero-section\assets\videos. I will name the files accordingly (the same) between both sources so each video knows which audio to play. so make the code ready-for-intergration the moment I input in the files. 

For now you can just use the same video and audio file for all the frames, I will replace them with different ones later.