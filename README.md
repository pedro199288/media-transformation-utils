# media-transformation-utils
A media (img/video/audio) transformation utils collection for resize, add subtitles, speech enhancement, etc.


## gen_img_and_videos_kgt.ts

Generate images and videos for Kaizengains Tracker
### Usage
**MANUALLY** prepare the "originals" directory with the original with its categories (based on Exercises Animatics categories on original bundle).

The categories are:
- Abdominals
- Back
- Biceps
- Cardio-Functional
- Chest
- Forearms
- Legs
- Powerlifting
- Shoulders
- Stretching
- Triceps

On each category folder, the exercise to transform to images and videos should be included without additional folders, just the file with the exercise name

### Run
```bash
npm run gen-img-and-videos-kgt
```

### To upload to the server:

Upload files (will overwrite existing files, should not be a problem as I will only upload new exercises):
```bash
scp -r ~/projects/mine/media-transformation-utils/src/kgt/output/* user@<ip-address>:/path/to/project/assets
```
Another alternative that I have not tested:
Upload new files (skip existing ones):
```bash
rsync -avz --ignore-existing /path/to/local/folder/ user@remote-server:/path/to/remote/folder/
```
