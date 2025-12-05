@echo off
echo Adding Hugging Face remote...
git remote add huggingface https://huggingface.co/spaces/mvvhmxd1/Satellite-image-Land-Classification-Time-series-analysis

echo Pushing files to Hugging Face...
echo You may be asked to log in. Use your Hugging Face username and token (Settings -> Access Tokens).
git push huggingface main --force

echo Done! Check your Space URL.
pause
