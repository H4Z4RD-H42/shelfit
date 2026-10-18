# shelfit.to

**shelfit.to** is a free planning tool for board game collectors. It helps you decide where each game goes on your shelves, so that as many games as possible fit and fewer are left out or stacked on top.

## What it does

- **Automatic placement**: it works out how to fit the boxes on the shelves, standing or lying flat.
- **Shelf layouts**: the IKEA KALLAX is the first option, and you can set up your own shelves.
- **Sorting and grouping**: by name, year, genre, players, playing time and more, with reserved areas for groups such as small games or games not played yet.
- **Manual control**: you can set the orientation and the box size of each game, choose the cubes for a group, and keep a game on top of the shelves or off them.
- **Views and printing**: 3D, front and list views, colour maps, and printable step-by-step instructions.
- **Your device, your data**: it runs in the browser on phone or computer, in Italian and English, and your collection stays on your device.

## BoardGameGeek data

Today games come from the [BoardGameGeek](https://boardgamegeek.com) collection export or are added by hand. The app does not use the BGG XML API yet; when it does:

- the data will be used only to size and sort the boxes in the user's own plan;
- it will not be changed, resold, shared with other services or used to train AI models;
- the API token will stay on a small server of this project, never shown to users and never in this repository;
- requests will be kept to a minimum: results stored and reused, requests spaced out.

The app already credits BGG as the source of the game data. Development notes are in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and the plans in [docs/ROADMAP.md](docs/ROADMAP.md).

## Changes

See the [changelog](CHANGELOG.md).

## Legal

KALLAX is a trademark of Inter IKEA Systems B.V. This project is not affiliated with, endorsed or sponsored by IKEA.

Released under the [MIT License](LICENSE).
