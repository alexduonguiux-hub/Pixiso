# Third-party assets

Only CC0 assets are bundled in this repository. Nothing from Mixamo is or may be committed.

| Asset | Location | Source | Version / commit | License |
|---|---|---|---|---|
| KayKit Character Pack: Adventurers 1.0 (Kay Lousberg) | `assets/vendor/kaykit-adventurers/` | https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 (also https://kaylousberg.itch.io/kaykit-adventurers) | `672074b73ba276876a19e8816ecdc5241817ab47` | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) — free for personal, educational and commercial use, no attribution required |

Only the glTF subset is kept (`Characters/gltf`, `Assets/gltf`, `LICENSE.txt`, `README.md`); the FBX files and sample renders are not needed. `pnpm assets:fetch` re-downloads exactly this subset from the pinned commit. `assets/vendor/kaykit-adventurers/SOURCE.json` records the provenance.

Attribution is not required by the license, but appreciated by the author: Kay Lousberg, https://www.kaylousberg.com.
