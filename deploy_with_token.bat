@echo off
set /p "TOKEN=Paste your Hugging Face Access Token (starting with hf_): "
if "%TOKEN%"=="" goto error

echo.
echo Initializing Git LFS...
git lfs install
git lfs track "*.h5"
git add .gitattributes
git commit -m "Enable Git LFS for models" 2>nul

echo.
echo Removing old remote...
git remote remove huggingface_token 2>nul

echo.
echo Adding remote with token...
git remote add huggingface_token https://mvvhmxd1:%TOKEN%@huggingface.co/spaces/mvvhmxd1/Satellite-image-Land-Classification-Time-series-analysis

echo.
echo Pushing to Hugging Face (LFS)...
git push huggingface_token main --force

echo.
echo Done! Please check your Space URL.
pause
goto :eof

:error
echo.
echo Error: Token is required.
pause
