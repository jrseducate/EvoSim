declareClass('Expression', function(expMap)
{
    this.expMap = expMap;
}, {
    getExpMap: function()
    {
        return this.expMap;
    },
    getExpKeys: function()
    {
        return Object.keys(this.expMap);
    },
    getExpVals: function()
    {
        return Object.values(this.expMap);
    },
    getRandomExpKey: function()
    {
        var expKeys = this.getExpKeys(),
            i       = Math.floor(Math.random() * expKeys.length);

        return expKeys[i];
    },
    getRandomExp: function()
    {
        var expKey = this.getRandomExpKey();

        return {
            key: expKey,
            val: this.expMap[expKey],
        };
    },
});

var startedAt = Math.floor(Date.now() / 1000);

declareClass('DNA', function(expression, options) {
    this.options    = options;
    this.exp        = expression;
    this.dnaInc     = 0;
    this.avgFitness = 0;
    this.cntFitness = 0;
    this.len        = try_get(options, 'len', try_get(options, 'dna.length', null));
    this.dna        = try_get(options, 'dna', this.randomDna(), is_array);
    this.activate   = try_get(options, 'activate', function(){throw 'this.activate is not defined!';}, is_function);
    this.update     = try_get(options, 'update', function(){throw 'this.update is not defined!';}, is_function);
    this.render     = try_get(options, 'render', function(){throw 'this.render is not defined!';}, is_function);

    (this.init      = try_get(options, 'init', function(){}, is_function)).apply(this);
}, {
    randomDna: function()
    {
        var res = [];

        if(!isset(this.exp))
        {
            throw 'DNA.exp must be set.';
        }
        if(!isset(this.len))
        {
            throw 'Either DNA.len or DNA.dna must be set.';
        }

        each(range(0, this.len), function(i)
        {
            res.push(this.exp.getRandomExp());
        });

        return res;
    },
    toString: function()
    {
        return JSON.stringify(this.getDna(), null, 2);
    },
    getDna: function()
    {
        return this.dna;
    },
    calcFitness : function(target)
    {
        return (1 / (Math.sqrt(Math.pow(target[0] - this.x, 2) + Math.pow(target[1] - this.y, 2)) + 1) * 50);//((Math.min(600, this.y) / 600) + (Math.min(800, this.x) / 800)) / 2;
    },
    mutate    : function()
    {
        var selectedIndex = Math.floor(Math.random() * this.dna.length);

        this.dna[selectedIndex] = this.exp.getRandomExp();
    },
    crossover : function(other)
    {
        if(other instanceof DNA)
        {
            var newDna = [],
                split  = Math.floor((Math.random() * (Math.min(this.dna.length, other.dna.length) / 2)) + (Math.min(this.dna.length, other.dna.length) / 4));

            for(var i = 0; i < Math.min(this.dna.length, other.dna.length); i++)
            {
                if(i < split)
                {
                    newDna.push(this.dna[i]);
                }
                else
                {
                    newDna.push(other.dna[i]);
                }
            }

            return New(DNA, this.exp, Object.assign(this.options, {dna: newDna}));
        }

        return this;
    }
});

declareClass('Population', function(options)
{
    this.size   = try_get(options, 'size', 100);
    this.dnaDef = try_get(options, 'dnaDef', {}, is_object);
    this.dnaExp = try_get(options, 'dnaExp', {}, is_object);
    this.target = try_get(options, 'target', {}, is_array);
    this.dnaList = this.generateDnaList();
    this.walls   = [];
}, {
    init : function()
    {
        each(this.dnaList, function(dna)
        {
            dna.init();
        });
    },
    generateDnaList : function()
    {
        var dnaList = [];

        for(var i = 0; i < this.size; i++)
        {
            dnaList.push(New(DNA, this.dnaExp, this.dnaDef));
        }

        return dnaList;
    },
    reproduce : function()
    {
        var fitList = [];

        each(this.dnaList, function(dna)
        {
            var fitness = dna.avgFitness,
                count   = Math.min(400, Math.floor(Math.pow(fitness * 100, 2) / Math.pow(100, 2) * 100)) / 4;//Math.floor(Math.max(fitness * 100, 50) - 49);

            for(var i = 0; i <= count; i++)
            {
                fitList.push(dna);
            }
        });

        var newFitList = [];

        for(var i = 0, j = fitList.length - 1; i < fitList.length / 2; i++, j--)
        {
            var selectedDna    = fitList[i],
                selectedDnaB   = fitList[j];

            newFitList.push(selectedDna.crossover(selectedDnaB));
        }

        this.dnaList = [];

        for(var i = 0; i < this.size; i++)
        {
            this.dnaList.push(newFitList[Math.floor(Math.random() * newFitList.length)]);
        }

        this.init();
    },
    checkHitWall : function(dna)
    {
        var wallHit = false;

        each(this.walls, function(wall)
        {
            if(is_array(wall) && wall[0] - 15 <= dna.x && wall[0] + 15 >= dna.x && wall[1] - 15 <= dna.y && wall[1] + 15 >= dna.y)
            {
                wallHit = true;
            }

            return !wallHit;
        });

        return wallHit;
    },
    toggleWall : function(x, y)
    {
        var context       = this,
            removeIndexes = [];

        each(this.walls, function(wall, i)
        {
            if(is_array(wall) && wall[0] - 15 <= x && wall[0] + 15 >= x && wall[1] - 15 <= y && wall[1] + 15 >= y)
            {
                removeIndexes.push(i);
            }
        });

        if(removeIndexes.length > 0)
        {
            each(removeIndexes, function(i)
            {
                context.walls[i] = null;
            });
        }
        else
        {
            this.walls.push([x, y]);
        }
    },
    render : function()
    {
        each(this.walls, function(wall)
        {
            if(is_array(wall))
            {
                graphics.fillStyle = '#000000';
                graphics.fillRect(wall[0] - 15, wall[1] - 15, 30, 30);
            }
        });

        each(this.dnaList, function(dna)
        {
            dna.render();
        });
    },
    update : function()
    {
        each(this.dnaList, function(dna)
        {
            dna.update();
        });
    },
});

var fitnessSpan = document.getElementById('app-fitness'),
    canvas      = document.getElementById('app-canvas'),
    graphics    = canvas.getContext('2d'),
    backMax     = 25,
    backMaxDist = 50,
    forwMax     = 25,
    forwMaxDist = 50,
    exp         = New(Expression, {
        up    : [0, 1],
        down  : [0, -1],
        left  : [-1, 0],
        right : [1, 0],
        back  : function()
        {
            this.inc    = try_get(this, 'inc', Math.floor(Math.random() * backMax) + 2) - 1;
            this.dist   = try_get(this, 'dist', Math.floor(Math.random() * backMaxDist) + 2);

            return this.inc > 0 ? this.dist : 0;
        },
        // forw  : function()
        // {
        //     this.inc    = try_get(this, 'inc', Math.floor(Math.random() * forwMax) + 1) - 1;
        //     this.dist   = try_get(this, 'dist', Math.floor(Math.random() * forwMaxDist) + 1);
        //
        //     return this.inc > 0 ? this.dist : 0;
        // }
    }),
    pop = New(Population, {
        size   : 150,
        dnaExp : exp,
        target : [750, 550],
        dnaDef : {
            len      : 100,
            init     : function()
            {
                this.dnaInc = 0;
                this.x      = 400;
                this.y      = 300;
                this.color  = try_get(this, 'color', getRandomColor() + '44', is_string);
            },
            activate : function()
            {
                var expression = this.dna[this.dnaInc];

                if(isset(expression))
                {
                    var res = true,
                        inc = this.dnaInc;

                    switch(typeof expression.val)
                    {
                        case 'function':
                            switch(expression.key)
                            {
                                case 'forw':
                                    this.dnaInc = Math.min(this.dna.length - 1, this.dnaInc + expression.val());
                                    break;
                                case 'back':
                                    this.dnaInc = Math.max(0, this.dnaInc - expression.val());
                                    break;
                            }
                            break;
                        default:
                            res = expression;
                            break;
                    }

                    if(inc === this.dnaInc)
                    {
                        this.dnaInc++;
                    }

                    if(res === true)
                    {
                        return this.activate();
                    }

                    return res;
                }

                return false;
            },
            update : function()
            {
                if(this.x <= 0 || this.x >= 800 || this.y <= 0 || this.y >= 600 || pop.checkHitWall(this))
                {
                    return true;
                }

                var expression = this.activate();

                if(is_array(expression.val) && expression.val.length === 2)
                {
                    this.x += expression.val[0] * 15;
                    this.y += expression.val[1] * 15;
                }

                this.avgFitness = ((this.avgFitness * this.cntFitness) + this.calcFitness(pop.target)) / ++this.cntFitness;

                return expression !== false;
            },
            render : function()
            {
                graphics.fillStyle = this.color;
                graphics.fillRect(this.x - 15, this.y - 15, 30, 30);
            },
        }
    });

var encoder,
    i        = 0,
    interval = setInterval(function()
{
    // graphics.clearRect(0, 0, 800, 600);

    graphics.fillStyle = '#FFFFFF11';
    graphics.fillRect(0, 0, 800, 600);

    graphics.fillStyle = '#FF0000';
    graphics.fillRect(pop.target[0] - 25, pop.target[1] - 25, 50, 50);

    graphics.fillStyle = '#000000';
    graphics.font      = "15px Arial";
    graphics.textAlign = "center";
    graphics.fillText("Dest", pop.target[0], pop.target[1] + 5);

    pop.render();
    if(isset(encoder))
    {
        encoder.addFrame(graphics);
    }

    pop.update();

    if(i++ >= 480)
    {
        var avgFitness = 0,
            breakCount = fitnessSpan.querySelectorAll('br');

        each(pop.dnaList, function(dna)
        {
            avgFitness += dna.avgFitness;
            dna.mutate();
        });

        avgFitness = avgFitness / pop.dnaList.length;

        if(breakCount.length >= 10)
        {
            var secondBreak       = fitnessSpan.innerHTML.lastIndexOf('<br>');
            fitnessSpan.innerHTML = fitnessSpan.innerHTML.slice(0, secondBreak);
        }

        fitnessSpan.innerHTML = "<br>Average Fitness: " + (avgFitness * 100).toFixed(2) + fitnessSpan.innerHTML;

        graphics.clearRect(0, 0, 800, 600);
        i = 0;
        pop.reproduce();
    }
}, 2);

var clickMode = 'dest',
    btnDest   = document.getElementById('app-button-dest'),
    btnWall   = document.getElementById('app-button-wall');

btnDest.onclick = function()
{
    if(!this.classList.contains('disabled'))
    {
        btnWall.classList.remove('disabled');
        btnWall.classList.remove('btn-primary');
        btnWall.classList.add('btn-danger');
        this.classList.add('disabled');
        this.classList.remove('btn-danger');
        this.classList.add('btn-primary');

        clickMode = 'dest';
    }
};

btnWall.onclick = function()
{
    if(!this.classList.contains('disabled'))
    {
        btnDest.classList.remove('disabled');
        btnDest.classList.remove('btn-primary');
        btnDest.classList.add('btn-danger');
        this.classList.add('disabled');
        this.classList.remove('btn-danger');
        this.classList.add('btn-primary');

        clickMode = 'wall';
    }
};

canvas.onclick = function(e)
{
    var rect = canvas.getBoundingClientRect(),
        x    = e.clientX - rect.left,
        y    = e.clientY - rect.top;

    console.log("x: " + x + " y: " + y);

    if(clickMode === 'dest')
    {
        pop.target = [x, y];
    }
    else if(clickMode === 'wall')
    {
        pop.toggleWall(x, y);
    }
};

document.onkeypress = function(e)
{
    if(e.key === ' ')
    {
        if(isset(encoder))
        {
            encoder.finish();

            var fileName = window.prompt("File Name", "download.gif");

            if(typeof fileName === 'string' && fileName.length > 0)
            {
                encoder.download(fileName);
            }

            encoder = null;
        }
        else
        {
            encoder = new GIFEncoder();
            encoder.setRepeat(0);
            encoder.setDelay(2);
            encoder.start();
        }
    }
};

function stop()
{
    clearInterval(interval);
}

// if(app.encoder)
// {
//     app.encoder.finish();
//
//     var binary_gif   = app.encoder.stream().getData(),
//         data_url     = 'data:image/gif;base64,' + encode64(binary_gif),
//         id           = 'app-preview-image-' + selectors.piContainer.children.length + 1,
//         active       = selectors.piContainer.children.length === 0 ? ' active' : '';
//         piContent    = htmlToElement('<div class="carousel-item' + active + '"> <img id="' + id + '" /><span class="centered preview-image-download" data-forward-click="#' + id + '">Download</span> </div>'),
//         previewImage = piContent.querySelector('img');
//
//     previewImage.src = data_url;
//
//     scope(function(encoder)
//     {
//         previewImage.onclick = null;
//         previewImage.onclick = function()
//         {
//             if(encoder && this.src !== null && this.src !== undefined && this.src.length > 0)
//             {
//                 var fileName = window.prompt("File Name", "download.gif");
//
//                 if(typeof fileName === 'string' && fileName.length > 0)
//                 {
//                     encoder.download(fileName);
//                 }
//             }
//         }
//     }, app.encoder);
//
//     selectors.piContainer.classList.add('enabled');
//     selectors.piContainer.parentNode.classList.add('enabled');
//     selectors.piContainer.appendChild(piContent);
// }
