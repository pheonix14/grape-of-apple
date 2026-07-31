# Project Release & Git Push Guidelines

- **Repository**: `https://github.com/pheonix14/grape-of-apple.git`
- **Git Binary Path**: `C:\Users\Roset\Desktop\PortableGit\cmd\git.exe` (if `git` is not in PATH)
- **Branch**: `main`

## Versioning & Push Protocol
Every time code updates or features are made in this repository:
1. Stage and commit the changes with a clear commit message.
2. Increment the patch version following the sequence:
   - Current release: `5.4`
   - Updates: `5.4.1`, `5.4.2`, `5.4.3`, ... up to `5.4.9`
   - After `5.4.9`: bump to minor version `5.5` (or `5.5.0`), then `5.5.1` through `5.5.9`, then `5.6`, etc.
3. Tag the commit with the new version (e.g. `git tag 5.4.1`).
4. Push the branch and tags to GitHub (`git push origin main --tags`).
