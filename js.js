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
    calcFitness : function()
    {
        return ((Math.min(600, this.y) / 600) + (Math.min(800, this.x) / 800)) / 2;
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
    this.dnaList = this.generateDnaList();
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
                count   = Math.floor(Math.pow(fitness * 100, 2) / Math.pow(100, 2) * 100);//Math.floor(Math.max(fitness * 100, 50) - 49);

            for(var i = 0; i < count; i++)
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
    render : function()
    {
        return each(this.dnaList, function(dna)
        {
            dna.render();
        });
    },
    update : function()
    {
        return each(this.dnaList, function(dna)
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
                if(this.x <= 0 || this.x >= 800 || this.y <= 0 || this.y >= 600)
                {
                    return true;
                }

                var expression = this.activate();

                if(is_array(expression.val) && expression.val.length === 2)
                {
                    this.x += expression.val[0] * 15;
                    this.y += expression.val[1] * 15;
                }

                this.avgFitness = ((this.avgFitness * this.cntFitness) + this.calcFitness()) / ++this.cntFitness;

                if(Math.random() < 0.005)
                {
                    this.mutate();
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

var i        = 0,
    interval = setInterval(function()
{
    graphics.clearRect(0, 0, 800, 600);

    graphics.fillStyle = '#FFFFFF';
    graphics.fillRect(0, 0, 800, 600);

    graphics.fillStyle = '#FF0000';
    graphics.fillRect(750, 550, 50, 50);

    graphics.fillStyle = '#000000';
    graphics.font      = "15px Arial";
    graphics.textAlign = "center";
    graphics.fillText("Dest", 775, 580);

    pop.render();
    pop.update();

    if(i++ >= 480)
    {
        var avgFitness = 0,
            breakCount = fitnessSpan.querySelectorAll('br');

        each(pop.dnaList, function(dna)
        {
            avgFitness += dna.avgFitness;
        });

        avgFitness = avgFitness / pop.dnaList.length;

        if(breakCount.length >= 10)
        {
            var secondBreak       = fitnessSpan.innerHTML.lastIndexOf('<br>');
            fitnessSpan.innerHTML = fitnessSpan.innerHTML.slice(0, secondBreak);
        }

        fitnessSpan.innerHTML = "<br>Average Fitness: " + (avgFitness * 100).toFixed(2) + fitnessSpan.innerHTML;

        i = 0;
        pop.reproduce();
    }
}, 5);

function stop()
{
    clearInterval(interval);
}
