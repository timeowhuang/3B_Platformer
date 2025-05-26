/*Eren Huang 
SlugID: 2140894
5-23-25
*/



class Platformer extends Phaser.Scene {
  constructor() {
    super("platformerScene");
  }

  init() {
    this.ACCELERATION = 1000;
    this.DRAG = 1200;
    this.physics.world.gravity.y = 3000;
    this.JUMP_VELOCITY = -850;
    this.MAX_X_VEL = 400;
    this.MAX_Y_VEL = 1000;
    this.ENEMY_SPEED = 100;

    this.SCENE_HEIGHT = 19 * 18 * SCALE;
    this.SCROLL_HEIGHT = 17 * 18 * SCALE;

    this.targetScrollY = 0;

    this.isSubmerged = false;
    this.WATER_GRAVITY = 250;
    this.WATER_JUMP_VELOCITY = -100;
    this.WATER_ACCELERATION = 150;
    this.WATER_DRAG = 800;
    this.waterTiles = [];
    this.EXIT_WATER_JUMP_VELOCITY = -600;
    this.WATER_MAX_X_VEL = 200;
    this.WATER_MAX_Y_VEL = 500;

    this.spikesTiles = [];

    this.animationFreq = 250;
    this.animationQueue = {
      //frames need to be offset by +1
      water: [34, 54],
      flag: [112, 113],
    };

    this.isDead = false;
    this.currentCheckpoint = null;
    this.music = this.sound.add("music", { loop: true, volume: 0.25 });
  }

  create() {
    this.map = this.add.tilemap("platformer-level-1", 18, 18, 120, 20);
    this.backgroundMap = this.add.tilemap(
      "platformer-level-1B",
      24,
      24,
      90,
      15
    );

    this.tileset = this.map.addTilesetImage(
      "kenny_tilemap_packed",
      "tilemap_tiles"
    );
    this.backgroundTileset = this.backgroundMap.addTilesetImage(
      "tilemap-backgrounds_packed",
      "tilemap-backgrounds_packed"
    );

    this.backgroundLayer = this.backgroundMap
      .createLayer("background", this.backgroundTileset, 0, 0)
      .setScrollFactor(0.25)
      .setScale(SCALE);

    this.cloudsLayer = this.map
      .createLayer("Clouds", this.tileset, 0, 0)
      .setScrollFactor(0.5)
      .setScale(SCALE);

    this.groundLayer = this.map
      .createLayer("Ground-n-Platforms", this.tileset, 0, 0)
      .setScale(SCALE);

    this.trapLayer = this.map
      .createLayer('Trap', this.tileset, 0, 0)
      .setScale(SCALE);



    this.playerSpawn = this.map.findObject(
      "Objects",
      (obj) => obj.name === "playerSpawn"
    );
    my.sprite.player = this.physics.add
      .sprite(
        this.playerSpawn.x * SCALE,
        this.playerSpawn.y * SCALE,
        "platformer_characters",
        "tile_0000.png"
      )
      .setScale(SCALE)
      .setMaxVelocity(this.MAX_X_VEL, this.MAX_Y_VEL);

      
    this.coinVfxEffect = this.add.particles(0, 0, 'star', {
                frame:     ['star.png'],     
                speed:     { min: -100, max: 100 },
                scale:     { start: 0.03, end: 0.01 },
                lifespan:  500,
                blendMode: 'ADD',
                quantity:  0,              
                on:   false                
    });


    this.createCoins();
    this.createEnemies();

    this.groundLayer.setCollisionByProperty({
      collides: true,
    });

    this.groundLayer.forEachTile((tile) => {
      if (tile.properties && tile.properties.water) {
        this.waterTiles.push(tile);
        const waterBody = this.add.rectangle(
          tile.pixelX * SCALE + (tile.width * SCALE) / 2,
          tile.pixelY * SCALE + (tile.height * SCALE) / 2,
          tile.width * SCALE,
          tile.height * SCALE,
          0x0000ff,
          0
        );
        this.physics.add.existing(waterBody, true);
        tile.waterBody = waterBody;
      }
    });


    this.spikesTiles = [];
this.trapLayer.forEachTile((tile) => {
  if (tile.properties && tile.properties.spikes) {
    this.spikesTiles.push(tile);
    const spikeBody = this.add.rectangle(
      tile.pixelX * SCALE + tile.width * SCALE*0.5,
      tile.pixelY * SCALE + tile.height * SCALE - 6,
      tile.width * SCALE,
      tile.height/2 * SCALE
    );
    this.physics.add.existing(spikeBody, true);
    tile.spikeBody = spikeBody;
    
  }
});

    this.waterTiles.forEach((tile) => {
      this.physics.add.overlap(my.sprite.player, tile.waterBody, () => {
        if (!this.isSubmerged) {
          this.isSubmerged = true;
          my.sprite.player.setVelocityY(60);
          this.sound.play("splash");
          this.physics.world.gravity.y = this.WATER_GRAVITY;
        }
      });
    });

    this.spikesTiles.forEach((tile) => {
      this.physics.add.overlap(my.sprite.player, tile.spikeBody, () => {
        if (!this.isDead) {
          this.playerDeath();
        }
      });
    });

    this.waterCheckTimer = this.time.addEvent({
      delay: 50,
      callback: this.checkWaterState,
      callbackScope: this,
      loop: true,
    });

    const mapWidth = this.map.widthInPixels * SCALE;
    const mapHeight = this.map.heightInPixels * SCALE;

    this.physics.add.collider(my.sprite.player, this.groundLayer);

    const leftWall = this.add
      .rectangle(0, 0, 1, mapHeight, 0x000000, 0)
      .setOrigin(0, 0);
    const rightWall = this.add
      .rectangle(mapWidth - 1, 0, 1, mapHeight, 0x000000, 0)
      .setOrigin(0, 0);
    const topWall = this.add
      .rectangle(0, 0, mapWidth, 1, 0x000000, 0)
      .setOrigin(0, 0);

    this.physics.add.existing(leftWall, true);
    this.physics.add.existing(rightWall, true);
    this.physics.add.existing(topWall, true);

    this.physics.add.collider(my.sprite.player, leftWall);
    this.physics.add.collider(my.sprite.player, rightWall);
    this.physics.add.collider(my.sprite.player, topWall);

    this.physics.world.bounds.setTo(
      0,
      0,
      this.map.widthInPixels * SCALE,
      this.map.heightInPixels * SCALE
    );

    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels * SCALE,
      this.map.heightInPixels * SCALE
    );

    this.cameras.main.startFollow(my.sprite.player, true, 0, 0);

    this.cameras.main.on("followupdate", (camera) => {
      const targetX = my.sprite.player.x - camera.width / 2;
      camera.scrollX = Phaser.Math.Clamp(
        targetX,
        0,
        this.map.widthInPixels * SCALE - camera.width
      );

      const playerScene = Math.floor(my.sprite.player.y / this.SCENE_HEIGHT);
      this.targetScrollY = playerScene * this.SCROLL_HEIGHT;

      camera.scrollY = Phaser.Math.Linear(
        camera.scrollY,
        this.targetScrollY,
        0.1
      );
    });

    this.physics.world.drawDebug = false;
    this.input.keyboard.on(
      "keydown-D",
      () => {
        this.physics.world.drawDebug = this.physics.world.drawDebug
          ? false
          : true;
        this.physics.world.debugGraphic.clear();
      },
      this
    );

    this.tileAnimationTimer = this.time.addEvent({
      delay: this.animationFreq,
      callback: this.animateTiles,
      callbackScope: this,
      loop: true,
    });

    cursors = this.input.keyboard.createCursorKeys();

    this.checkpoint = this.map.findObject(
      "Objects",
      (obj) => obj.name === "checkpointSpawn"
    );

    this.victoryFlag = this.map.findObject(
      "Objects",
      (obj) => obj.name === "victoryFlag"
    );

    this.music.play();
  }

  createCoins() {
    this.coins = this.map.createFromObjects("Objects", {
      name: "coin",
      key: "tilemap_tiles",
      frame: 151,
    });

    this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
    this.coins.map((coin) => {
      coin.setScale(SCALE);
      coin.x = coin.x * SCALE;
      coin.y = coin.y * SCALE;
      coin.body.x = coin.x;
      coin.body.y = coin.y;
      coin.body.setCircle(5 * SCALE).setOffset(-5 * SCALE, -5 * SCALE);
      coin.anims.play("coin");
    });
    this.coinGroup = this.add.group(this.coins);

    this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
      const { x, y } = obj2;
      obj2.destroy();
        this.coinVfxEffect.explode(10, x, y);
        this.sound.play("coin_collect");
      
    });
  }


  createEnemies() {
    this.enemyGroup = this.physics.add.group();

    const enemySpawns = this.map.filterObjects(
      "Objects",
      (obj) => obj.name === "enemySpawn"
    );

    enemySpawns.forEach((spawn) => {
      const enemy = this.physics.add
        .sprite(
          spawn.x * SCALE,
          spawn.y * SCALE,
          "platformer_characters",
          "tile_0018.png"
        )
        .setScale(SCALE);

      enemy.body.setSize(9 * SCALE, 9 * SCALE).setOffset(2 * SCALE, 3 * SCALE);

      this.enemyGroup.add(enemy);

      enemy.anims.play("enemy");

      this.physics.add.collider(enemy, this.groundLayer);

      this.physics.add.collider(enemy, my.sprite.player, (obj1, player) => {
        const playerBottom = player.body.y + player.body.height;
        const enemyTop = enemy.body.y;
        if (playerBottom <= enemyTop) {
          enemy.destroy();
          player.body.setVelocityY(this.JUMP_VELOCITY);
          this.sound.play("enemy_death");
        } else if (!this.isDead) {
          this.playerDeath();
        }
      });

      enemy.setVelocityX(-this.ENEMY_SPEED);
    });

    this.enemyBouncers = this.map.createFromObjects("Objects", {
      name: "enemyBouncer",
    });

    this.physics.world.enable(
      this.enemyBouncers,
      Phaser.Physics.Arcade.STATIC_BODY
    );
    this.enemyBouncers.forEach((bouncer) => {
      bouncer.setScale(SCALE);
      bouncer.x = bouncer.x * SCALE;
      bouncer.y = bouncer.y * SCALE;
      bouncer.body.x = bouncer.x;
      bouncer.body.y = bouncer.y;
      bouncer.setVisible(false);
    });

    this.physics.add.collider(
      this.enemyGroup,
      this.enemyBouncers,
      (bouncer, enemy) => {
        const wasMovingLeft = !enemy.flipX;

        enemy.setVelocityX(
          wasMovingLeft ? this.ENEMY_SPEED : -this.ENEMY_SPEED
        );
        enemy.flipX = wasMovingLeft;
      }
    );
  }

  animateTiles() {
    let tileQueue = Object.entries(this.animationQueue);
    for (const entry of tileQueue) {
      this.groundLayer.swapByIndex(entry[1][0], entry[1][1]);
      let tileID = entry[1].shift();
      entry[1].push(tileID);
      this.animationQueue[entry[0]] = entry[1];
    }
  }

  nextScene() {
    this.scene.start("victoryScreenScene");
  }

  update() {
    if (!this.isDead && my.sprite.player.y > this.map.heightInPixels * SCALE) {
      this.playerDeath();
    }

    if (
      this.checkpoint &&
      !this.currentCheckpoint &&
      my.sprite.player.x > this.checkpoint.x * SCALE
    ) {
      this.currentCheckpoint = {
        x: this.checkpoint.x * SCALE,
        y: this.checkpoint.y * SCALE,
      };
      this.sound.play("checkpoint");
    }
    if (my.sprite.player.x > this.victoryFlag.x * SCALE) {
      this.sound.play("checkpoint");
      this.nextScene();
    }

    if (!this.isDead) {
      const currentAcceleration = this.isSubmerged
        ? this.WATER_ACCELERATION
        : this.ACCELERATION;
      const currentDrag = this.isSubmerged ? this.WATER_DRAG : this.DRAG;
      const currentJumpVelocity = this.isSubmerged
        ? this.WATER_JUMP_VELOCITY
        : this.JUMP_VELOCITY;

      if (this.isSubmerged) {
        my.sprite.player.body.setMaxVelocityX(this.WATER_MAX_X_VEL);
        my.sprite.player.body.setMaxVelocityY(this.WATER_MAX_Y_VEL);
      } else {
        my.sprite.player.body.setMaxVelocityX(this.MAX_X_VEL);
        my.sprite.player.body.setMaxVelocityY(this.MAX_Y_VEL);
      }

      if (cursors.left.isDown) {
        my.sprite.player.body.setAccelerationX(-currentAcceleration);
        my.sprite.player.resetFlip();
        if (!this.isSubmerged) {
          my.sprite.player.anims.play("walk", true);
        }
      } else if (cursors.right.isDown) {
        my.sprite.player.body.setAccelerationX(currentAcceleration);
        my.sprite.player.setFlip(true, false);
        if (!this.isSubmerged) {
          my.sprite.player.anims.play("walk", true);
        }
      } else {
        my.sprite.player.body.setAccelerationX(0);
        my.sprite.player.body.setDragX(currentDrag);
      }

      if (
        (!my.sprite.player.body.blocked.down && !this.isSubmerged) ||
        (this.isSubmerged && my.sprite.player.body.velocity.y < 0)
      ) {
        my.sprite.player.anims.play("jump");
      } else if (!cursors.left.isDown && !cursors.right.isDown) {
        my.sprite.player.anims.play("idle");
      }

      if (
        (my.sprite.player.body.blocked.down || this.isSubmerged) &&
        Phaser.Input.Keyboard.JustDown(cursors.up)
      ) {
        my.sprite.player.body.setVelocityY(currentJumpVelocity);
        let jumpSound = Phaser.Math.Between(1, 3);
        this.sound.play("jump" + jumpSound, {
          volume: 0.25,
        });
      }
    }
  }

  playerDeath() {
    this.isDead = true;
    this.sound.play("player_death", {
      volume: 0.35,
    });
    this.music.stop();
    my.sprite.player.visible = false;
    my.sprite.player.body.setVelocity(0, 0);
    my.sprite.player.body.setAcceleration(0, 0);
    this.physics.world.gravity.y = 0;
    this.time.delayedCall(5000, () => {
      this.restartPlayer();
    });
  }

  restartPlayer() {
    if (this.currentCheckpoint) {
      my.sprite.player.x = this.currentCheckpoint.x;
      my.sprite.player.y = this.currentCheckpoint.y;
    } else {
      my.sprite.player.x = this.playerSpawn.x * SCALE;
      my.sprite.player.y = this.playerSpawn.y * SCALE;
    }

    this.coinGroup.clear(true, true);
    this.enemyGroup.clear(true, true);
    this.enemyBouncers.forEach((bouncer) => bouncer.destroy());

    this.createCoins();
    this.createEnemies();

    this.physics.world.gravity.y = 3000;
    my.sprite.player.visible = true;
    this.isDead = false;
    this.music.play();
  }

  checkWaterState() {
    let isInWater = false;

    for (const tile of this.waterTiles) {
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(
          my.sprite.player.getBounds(),
          tile.waterBody.getBounds()
        )
      ) {
        isInWater = true;
        break;
      }
    }

    if (isInWater !== this.isSubmerged) {
      if (!isInWater && this.isSubmerged && cursors.up.isDown) {
        my.sprite.player.setVelocityY(this.EXIT_WATER_JUMP_VELOCITY);
      }
      this.isSubmerged = isInWater;
      this.physics.world.gravity.y = isInWater ? this.WATER_GRAVITY : 2000;
    }
  }
}
