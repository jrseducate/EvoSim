declareClass('Expression', function(expMap)
{
    this.expMap = expMap;
}, {
    toString: function()
    {
        return JSON.stringify(this);
    },
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
    if(is_object(expression))
    {
        this.exp = expression;
    }
    if(is_object(options))
    {
        this.options    = options;
        this.dnaInc     = 0;
        this.avgFitness = 0;
        this.cntFitness = 0;
        this.len        = try_get(options, 'len', try_get(options, 'dna.length', null));
        this.dna        = try_get(options, 'dna', this.randomDna(), is_array);
        this.activate   = try_get(options, 'activate', function(){throw 'this.activate is not defined!';}, is_function);
        this.update     = try_get(options, 'update', function(){throw 'this.update is not defined!';}, is_function);
        this.render     = try_get(options, 'render', function(){throw 'this.render is not defined!';}, is_function);

        (this.init      = try_get(options, 'init', function(){}, is_function)).apply(this);
    }
}, {
    hitBoundary : function()
    {
        return (this.x <= 0 || this.x >= 800 || this.y <= 0 || this.y >= 600 || pop.checkHitWall(this));
    },
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
        var thisCopy = Object.assign({}, this);

        each(thisCopy, function(val, key)
        {
            if(is_function(val) && is_function(val.toString))
            {
                thisCopy[key] = 'func:' + val.toString();
            }
        });

        thisCopy.options = Object.assign({}, this.options);

        each(thisCopy.options, function(val, key)
        {
            if(is_function(val) && is_function(val.toString))
            {
                thisCopy.options[key] = 'func:' + val.toString();
            }
        });

        return JSON.stringify(thisCopy);
    },
    getDna: function()
    {
        return this.dna;
    },
    calcFitness : function(target)
    {
        var xDist = Math.abs(target[0] - this.x),
            yDist = Math.abs(target[1] - this.y),
            pow   = 5,
            res   = Math.pow((((800 + 600) - Math.max(xDist + yDist, 1)) / (800 + 600)) * 10, pow) / Math.pow(9, pow);

        return res;//(1 / (Math.sqrt(Math.pow(target[0] - this.x, 2) + Math.pow(target[1] - this.y, 2)) + 1) * 50);//((Math.min(600, this.y) / 600) + (Math.min(800, this.x) / 800)) / 2;
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
    if(is_object(options))
    {
        this.tick   = 0;
        this.size   = try_get(options, 'size', 100);
        this.dnaDef = try_get(options, 'dnaDef', {}, is_object);
        this.dnaExp = try_get(options, 'dnaExp', {}, is_object);
        this.target = try_get(options, 'target', {}, is_array);
        this.dnaList = this.generateDnaList();
        this.walls   = [];
    }
}, {
    toString : function()
    {
        var res = [];

        res.push('"size": ' + JSON.stringify(this.size));
        res.push('"walls": ' + JSON.stringify(this.walls));
        res.push('"target": ' + JSON.stringify(this.target));
        res.push('"dnaDef": ' + JSON.stringify(this.dnaDef));
        res.push('"dnaExp": ' + this.dnaExp.toString());
        res.push('"dnaList": [' + this.dnaList.map(function(v)
        {
            return v.toString();
        }).join(',') + ']');

        res = '{' + res.join(',') + '}';

        return res;
    },
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
            var fitness = dna.hitBoundary() ? 0 : dna.fitness / pop.tick,
                count   = Math.floor(fitness * 100);

            for(var i = 0; i <= count; i++)
            {
                fitList.push(dna);
            }
        });

        var newFitList = [];

        for(var i = 0; i < fitList.length; i++)
        {
            var selectedDna    = fitList[Math.floor(Math.random() * (fitList.length / 2))],
                selectedDnaB   = fitList[Math.floor((Math.random() * (fitList.length / 2)) + (fitList.length / 2))];

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
                context.walls.splice(i, 1);
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
            len      : 200,
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
                var expression = false;

                if(!this.hitBoundary())
                {
                    expression = this.activate();

                    if(is_array(expression.val) && expression.val.length === 2)
                    {
                        this.x += expression.val[0] * 15;
                        this.y += expression.val[1] * 15;
                    }
                    // this.avgFitness = ((this.avgFitness * this.cntFitness) + this.calcFitness(pop.target)) / ++this.cntFitness;
                }

                if(expression !== false)
                {
                    this.fitness = (this.fitness || 0) + this.calcFitness(pop.target);
                }

                return expression !== false;
            },
            render : function()
            {
                graphics.fillStyle = this.color;
                graphics.fillRect(this.x - 15, this.y - 15, 30, 30);
            },
        }
    });

function updateApp()
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

    if(pop.tick++ >= 480)
    {
        var avgFitness = 0,
            breakCount = fitnessSpan.querySelectorAll('br');

        each(pop.dnaList, function(dna)
        {
            avgFitness += dna.fitness / pop.tick;

            if(Math.random() < 0.25)
            {
                dna.mutate();
            }
        });

        avgFitness = avgFitness / pop.dnaList.length;

        if(breakCount.length >= 10)
        {
            var secondBreak       = fitnessSpan.innerHTML.lastIndexOf('<br>');
            fitnessSpan.innerHTML = fitnessSpan.innerHTML.slice(0, secondBreak);
        }

        fitnessSpan.innerHTML = "<br>Average Fitness: " + (avgFitness * 100).toFixed(2) + fitnessSpan.innerHTML;

        graphics.clearRect(0, 0, 800, 600);
        pop.reproduce();
        pop.tick = 0;

        if(is_function(pop.onComplete))
        {
            pop.onComplete();
            pop.onComplete = null;
        }
    }
}

function start()
{
    interval = setInterval(updateApp, 2);
}

function stop(callback)
{
    pop.onComplete = function()
    {
        clearInterval(interval);
        interval = null;

        if(is_function(callback))
        {
            callback();
        }
    }

    if(!is_function(callback))
    {
        pop.onComplete();
        pop.onComplete = null;
    }
}

var encoder,
    interval;

start();

var clickMode = 'dest',
    btnGif    = document.getElementById('app-button-gif'),
    btnPause  = document.getElementById('app-button-pause'),
    btnDump   = document.getElementById('app-button-dump'),
    btnDest   = document.getElementById('app-button-dest'),
    btnWall   = document.getElementById('app-button-wall');

btnDest.onclick = function()
{
    if(!this.classList.contains('disabled'))
    {
        btnWall.classList.remove('disabled');
        btnWall.classList.remove('btn-primary');
        btnWall.classList.add('btn-secondary');
        this.classList.add('disabled');
        this.classList.remove('btn-secondary');
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
        btnDest.classList.add('btn-secondary');
        this.classList.add('disabled');
        this.classList.remove('btn-secondary');
        this.classList.add('btn-primary');

        clickMode = 'wall';
    }
};

canvas.onclick = function(e)
{
    var rect = canvas.getBoundingClientRect(),
        x    = e.clientX - rect.left,
        y    = e.clientY - rect.top;

    if(clickMode === 'dest')
    {
        pop.target = [x, y];
    }
    else if(clickMode === 'wall')
    {
        pop.toggleWall(x, y);
    }
};

btnGif.onclick = function(e)
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

        btnGif.innerText = 'Gif';
        btnGif.classList.remove('btn-success');
        btnGif.classList.add('btn-primary');
    }
    else
    {
        encoder = new GIFEncoder();
        encoder.setRepeat(0);
        encoder.setDelay(2);
        encoder.start();

        btnGif.innerText = 'Gif : Finish';
        btnGif.classList.remove('btn-primary');
        btnGif.classList.add('btn-success');
    }
};

btnPause.onclick = function()
{
    if(isset(interval) && !isset(pop.onComplete))
    {
        stop();
        btnPause.innerText = "Resume";
        btnPause.classList.remove('btn-danger');
        btnPause.classList.add('btn-success');
    }
    else if(!isset(interval))
    {
        start();
        btnPause.innerText = "Pause";
        btnPause.classList.remove('btn-success');
        btnPause.classList.add('btn-danger');
    }
};

// btnDump.onclick = function()
// {
//     stop(function()
//     {
//         var popStr = Base64.toBase64(pop.toString()),
//             res    = null;
//
//         Swal.fire({
//             input: 'textarea',
//             inputValue: popStr,
//             inputPlaceholder: 'Paste the pop state here...',
//             showCancelButton: true
//         }).then(function(result)
//         {
//             if(result.value)
//             {
//                 res = Base64.fromBase64(result.value);
//
//                 if(is_string(res) && res.length > 0)
//                 {
//                     try
//                     {
//                         res = JSON.parse(res);
//                     }
//                     catch (e){};
//
//                     if(is_object(res))
//                     {
//                         pop = Object.assign(pop, res);
//
//                         for(var i = 0; i < pop.dnaList.length; i++)
//                         {
//                             if(is_object(pop.dnaList[i]))
//                             {
//                                 pop.dnaList[i]     = Object.assign(New(DNA), pop.dnaDef, pop.dnaList[i]);
//                                 pop.dnaList[i].exp = Object.assign(New(Expression), pop.dnaList[i].exp);
//
//                                 each(pop.dnaList[i], function(v, k)
//                                 {
//                                     if(is_string(v) && v.indexOf('func:') === 0)
//                                     {
//                                         v = v.slice('func:'.length);
//
//                                         try
//                                         {
//                                             v = eval('(function(){return ' + v + '})()');
//                                         }
//                                         catch(e){};
//                                         pop.dnaList[i][k] = v;
//                                     }
//                                 });
//                                 each(pop.dnaList[i].options, function(v, k)
//                                 {
//                                     if(is_string(v) && v.indexOf('func:') === 0)
//                                     {
//                                         v = v.slice('func:'.length);
//
//                                         try
//                                         {
//                                             v = eval('(function(){return ' + v + '})()');
//                                         }
//                                         catch(e){};
//                                         pop.dnaList[i].options[k] = v;
//                                     }
//                                 });
//                             }
//                         }
//
//                         pop.dnaExp = Object.assign(New(Expression), pop.dnaExp);
//                         pop        = Object.assign(New(Population), pop);
//                     }
//                 }
//             }
//
//             start();
//         }).catch(function()
//         {
//             start();
//         });
//     });
// };
