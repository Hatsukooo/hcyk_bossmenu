Config = {}

Config.ResourceName = GetCurrentResourceName()
Config.Debug = true 

Config.MenuCooldown = 1000
Config.MaxTransaction = 100000

Config.Locations = {
    {
        name = "PDčka",
        job = 'police',
        location = vec3(451.9221, -989.8572, 31.0262),
        model = 'edynu_marker5'
    },
    {
        name = "EMSka",
        job = 'ambulance',
        location = vec3(-75.4848, -820.0671, 326.1752),
        model = 'edynu_marker5'
    },
    {
        name = "LSCcko",
        job = 'lsc',
        location = vec3(-74.4848, -819.0671, 326.1752),
        model = 'edynu_marker5'
    }
}

Config.AllowedGrades = {
    'boss',
    'chief_of_police',
    -- 'ADD YOUR OWN GRADE HERE',
}