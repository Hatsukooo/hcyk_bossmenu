createdZones = {}
insidePoint = nil

function loadModel(model)
    if not HasModelLoaded(model) then
        RequestModel(model)
        local startTime = GetGameTimer()
        while not HasModelLoaded(model) do
            Citizen.Wait(10)
            if GetGameTimer() - startTime > 5000 then
                return false
            end
        end
    end
    return true
end

function createZone(name, job, point, model)
    if not loadModel(GetHashKey(model)) then
        debugPrint("Model not loaded: " .. model)
        return
    end

    local poly = BoxZone:Create(point, 2.0, 2.0, {
        name = name,
        heading = 0.0,
        minZ = point.z - 3.0,
        maxZ = point.z + 3.0,
    })

    -- local object = CreateObject(GetHashKey(model), point.x, point.y, point.z, false, false, false)
    SetEntityHeading(object, 0.0)
    FreezeEntityPosition(object, true)
    SetEntityAsMissionEntity(object, true, true)

    TriggerEvent('poly:createCircleZone', name, point.xyz, 2.0, {
        id = 'bosszone_' .. name,
        minZ = point.z - 1.0,
        maxZ = point.z + 1.0,
        marker = { model = model, drawDist = 10 }
    })  
    
    createdZones[name] = {
        poly = poly,
        object = object,
        coords = point,
        job = job
    }

    poly:onPlayerInOut(function(isPointInside, _)
        if isPointInside then
            insidePoint = name
            listenForKey(name, job)
        else
            insidePoint = nil
            exports['okokTextUI']:Close()
        end
    end)
end

function deleteZone(name)
    if createdZones[name] then
        if DoesEntityExist(createdZones[name].object) then
            -- DeleteObject(createdZones[name].object)
        end

        createdZones[name].poly:destroy()
        createdZones[name] = nil
    end
end

function loadBossZones()
    if not Config.Locations or #Config.Locations == 0 then
        return
    end

    for _, zone in ipairs(Config.Locations) do
        createZone(zone.name, zone.job, zone.location, zone.model)
    end
end

function listenForKey(name, job)
    local zoneName = name
    insidePoint = name
    local currentMessage = nil

    CreateThread(function()
        debugPrint("Starting key listener for zone:", zoneName, "job:", job)
        
        while insidePoint == zoneName do
            local message = 'Stiskni [E] pro otevření boss menu'
    
            if message ~= currentMessage then
                if currentMessage ~= nil then
                    exports['okokTextUI']:Close()
                end
                exports['okokTextUI']:Open(message, 'darkblue', 'right', false)
                currentMessage = message
            end
    
            -- Vylepšená kontrola s logováním
            if IsControlJustReleased(0, 38) then
                if not IsMenuOpen() then
                    debugPrint("E key pressed in zone", zoneName, "- opening menu for job:", job)
                    debugPrint("Menu state before opening:", IsMenuOpen())
                    OpenBossMenu(job)
                else
                    debugPrint("E key pressed but menu is already open (state:", IsMenuOpen(), ")")
                end
            end
    
            Wait(0)
        end

        debugPrint("Exiting key listener for zone:", zoneName)
        if currentMessage ~= nil then
            exports['okokTextUI']:Close()
            currentMessage = nil
        end
    end)
end