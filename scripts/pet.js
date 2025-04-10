class Pet {
    constructor(savedState = null) {
        this.stats = savedState?.stats || {
            hunger: 100,
            cleanliness: 0,
            energy: 100,
            meals: 0,
            cleans: 0
        };
        
        this.state = savedState?.state || {
            isSleeping: false,
            isMoving: false,
            direction: 'right'
        };
        
        this.element = document.getElementById('pet');
        this.container = document.getElementById('petContainer');
        this.init();
    }

    init() {
        this.setAnimation(this.state.isSleeping ? 'sleep' : 'idle');
        this.updateDirection();
        this.startIdleBehavior();
        this.startStatusDecay();
        this.setupAutoSave();
    }

    setAnimation(animation) {
        const animations = {
            idle: { class: 'idle', yPos: 0 },
            walk: { class: 'walking', yPos: -64 },
            eat: { class: 'eating', yPos: -128 },
            sleep: { class: 'sleeping', yPos: -192 }
        };

        this.element.style.backgroundPositionY = `${animations[animation].yPos}px`;
        this.element.className = `pet ${animations[animation].class}`;
    }

    updateDirection() {
        this.element.style.transform = this.state.direction === 'left' ?
            'scaleX(-1)' :
            'scaleX(1)';
    }

    startIdleBehavior() {
        this.idleInterval = setInterval(() => {
            if(!this.state.isSleeping && Math.random() < 0.3) {
                this.randomMovement();
            }
        }, 5000);
    }

    randomMovement() {
        this.state.direction = Math.random() < 0.5 ? 'left' : 'right';
        this.updateDirection();
        this.setAnimation('walk');
        this.state.isMoving = true;

        setTimeout(() => {
            this.setAnimation('idle');
            this.state.isMoving = false;
        }, 2000);
    }

    startStatusDecay() {
        this.decayInterval = setInterval(() => {
            if(!this.state.isSleeping) {
                this.stats.hunger = Math.max(0, this.stats.hunger - 0.3);
                this.stats.energy = Math.max(0, this.stats.energy - 0.2);
                this.stats.cleanliness = Math.min(100, this.stats.cleanliness + 0.1);
                
                if(this.stats.cleanliness >= 30 && !this.container.querySelector('.poop')) {
                    this.createPoop();
                }
            }
            this.updateUI();
        }, 1000);
    }

    setupAutoSave() {
        this.saveInterval = setInterval(() => this.saveGame(), 30000);
    }

    saveGame() {
        const saveData = {
            stats: this.stats,
            state: this.state,
            achievements: AchievementSystem.getUnlocked()
        };
        localStorage.setItem('petSave', JSON.stringify(saveData));
    }

    createPoop() {
        const poop = document.createElement('div');
        poop.className = 'poop';
        poop.style.left = `${Math.random() * 48}px`;
        poop.style.bottom = '0';
        this.container.appendChild(poop);
        
        // Adiciona partículas ao criar cocô
        ParticleSystem.create(
            this.container.offsetLeft + parseInt(poop.style.left),
            this.container.offsetTop + 64,
            'poop',
            5
        );
    }

    feed() {
        if(this.state.isSleeping) return;
        
        this.stats.meals++;
        this.stats.hunger = Math.min(100, this.stats.hunger + 15);
        this.setAnimation('eat');
        
        // Partículas de comida
        ParticleSystem.create(
            this.container.offsetLeft + 32,
            this.container.offsetTop + 32,
            'food',
            12
        );

        setTimeout(() => {
            this.setAnimation('idle');
            this.stats.cleanliness += 10;
            this.updateUI();
        }, 2000);
    }

    clean() {
        this.stats.cleans++;
        this.stats.cleanliness = 0;
        
        // Partículas de limpeza
        ParticleSystem.create(
            this.container.offsetLeft + 32,
            this.container.offsetTop + 32,
            'clean',
            15
        );

        document.querySelectorAll('.poop').forEach(p => p.remove());
        this.updateUI();
    }

    toggleSleep() {
        this.state.isSleeping = !this.state.isSleeping;
        this.setAnimation(this.state.isSleeping ? 'sleep' : 'idle');
        
        if(this.state.isSleeping) {
            this.stats.energy = 100;
            // Partículas de sono
            if(!this.state.isMoving) {
                ParticleSystem.create(
                    this.container.offsetLeft + 32,
                    this.container.offsetTop,
                    'sleep',
                    8
                );
            }
        }
        this.updateUI();
    }

    updateUI() {
        document.getElementById('hunger').textContent = Math.floor(this.stats.hunger);
        document.getElementById('cleanliness').textContent = Math.floor(this.stats.cleanliness);
        document.getElementById('energy').textContent = Math.floor(this.stats.energy);
        
        // Verifica achievements
        AchievementSystem.check(this.stats);
    }
}

class ParticleSystem {
    static create(x, y, type, count = 8) {
        for(let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = `particle ${type}`;
            
            const angle = (Math.PI * 2 * i)/count;
            particle.style.setProperty('--tx', `${Math.cos(angle) * 50}px`);
            particle.style.setProperty('--ty', `${Math.sin(angle) * 50 - 50}px`);
            
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 1000);
        }
    }
}

class AchievementSystem {
    static achievements = {
        firstMeal: {
            name: 'Primeira Refeição!',
            desc: 'Alimente seu pet pela primeira vez',
            condition: (stats) => stats.meals >= 1,
            unlocked: false
        },
        cleanMaster: {
            name: 'Faxineiro Profissional',
            desc: 'Limpe o pet 10 vezes',
            condition: (stats) => stats.cleans >= 10,
            unlocked: false
        },
        nightOwl: {
            name: 'Coruja Noturna',
            desc: 'Coloque o pet para dormir 5 vezes',
            condition: (stats) => stats.sleeps >= 5,
            unlocked: false
        }
    };

    static check(stats) {
        Object.entries(this.achievements).forEach(([key, achievement]) => {
            if(!achievement.unlocked && achievement.condition(stats)) {
                this.unlock(key);
            }
        });
    }

    static unlock(key) {
        this.achievements[key].unlocked = true;
        this.showNotification(this.achievements[key]);
    }

    static showNotification(achievement) {
        const div = document.createElement('div');
        div.className = 'achievement-notification';
        div.innerHTML = `
            <div class="achievement-icon">🎖️</div>
            <div class="achievement-text">
                <h4>${achievement.name}</h4>
                <p>${achievement.desc}</p>
            </div>
        `;
        
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 5000);
    }

    static getUnlocked() {
        return Object.fromEntries(
            Object.entries(this.achievements)
                .filter(([_, a]) => a.unlocked)
                .map(([key, a]) => [key, { unlocked: a.unlocked }])
        );
    }

    static load(saved) {
        if(saved) {
            Object.keys(saved).forEach(key => {
                if(this.achievements[key]) {
                    this.achievements[key].unlocked = saved[key].unlocked;
                }
            });
        }
    }
}

// Inicialização do jogo
const game = {
    pet: null
};

// Precarga de assets e inicialização
window.onload = () => {
    // Carrega imagens
    new Image().src = 'assets/sprites/pet.png';
    new Image().src = 'assets/sprites/coco.png';

    // Carrega jogo salvo
    const savedData = JSON.parse(localStorage.getItem('petSave'));
    game.pet = new Pet(savedData);
    
    // Carrega achievements
    AchievementSystem.load(savedData?.achievements);

    // Botão de reset
    document.getElementById('resetBtn')?.addEventListener('click', () => {
        if(confirm('Tem certeza que quer resetar seu pet?')) {
            localStorage.removeItem('petSave');
            location.reload();
        }
    });
};