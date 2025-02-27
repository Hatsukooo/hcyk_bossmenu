ESX = exports["es_extended"]:getSharedObject()

menuOpen = false  
local PlayerData = {}

RegisterNetEvent('esx:playerLoaded')
AddEventHandler('esx:playerLoaded', function(xPlayer)
    PlayerData = xPlayer
end)

RegisterNetEvent('esx:setJob')
AddEventHandler('esx:setJob', function(job)
    PlayerData.job = job
end)

function debugPrint(...)
    if Config.Debug then print('[HCYK_BOSSACTIONS]', ...) end
end

function SetMenuOpen(state)
    menuOpen = state
    debugPrint("Menu state set to:", menuOpen)
end

function IsMenuOpen()
    return menuOpen
end

CreateThread(function()
    while ESX.GetPlayerData().job == nil do
        Citizen.Wait(100)
    end
    PlayerData = ESX.GetPlayerData()

    loadBossZones()
end)

RegisterNUICallback('hideUI', function(_, cb)
    debugPrint("hideUI callback called, setting menu state to closed")
    
    SetMenuOpen(false)
    SetNuiFocus(false, false)
    
    cb({success = true})
    
    SendNUIMessage({
        action = 'setVisible',
        data = false
    })
    
    Citizen.SetTimeout(500, function()
        if IsMenuOpen() then
            debugPrint("WARNING: Menu still shows as open after hideUI!")
            SetMenuOpen(false)
        else
            debugPrint("Menu successfully closed")
        end
    end)
end)

RegisterNUICallback('getEmployees', function(data, cb)
    debugPrint('Fetching employees for job', data.job)
    
    lib.callback('hcyk_bossactions:getEmployees', 1000, function(employees)
        if employees then
            debugPrint('Received', #employees, 'employees')
            cb(employees)
        else
            debugPrint('No employees received')
            cb({})
        end
    end, data.job)
end)

RegisterNUICallback('getSocietyMoney', function(data, cb)
    lib.callback('hcyk_bossactions:getSocietyMoney', 1000, function(money)
        cb(money or 0)
    end, data.job)
end)

RegisterNUICallback('getFinancialStats', function(data, cb)
    lib.callback('hcyk_bossactions:getFinancialStats', 1000, function(stats)
        if stats then
            cb(stats)
        else
            cb({income = 0, expenses = 0, netProfit = 0})
        end
    end, data.job, data.timeRange)
end)

RegisterNUICallback('getRanks', function(data, cb)
    lib.callback('hcyk_bossactions:getRanks', 1000, function(ranks)
        if ranks then
            cb(ranks)
        else
            cb({})
        end
    end, data.job)
end)

RegisterNUICallback('hireEmployee', function(data, cb)
    lib.callback('hcyk_bossactions:hireEmployee', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.player, data.position)
end)

RegisterNUICallback('fireEmployee', function(data, cb)
    lib.callback('hcyk_bossactions:fireEmployee', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.identifier)
end)

RegisterNUICallback('setEmployeeDetails', function(data, cb)
    lib.callback('hcyk_bossactions:setGrade', 1000, function(result)
        if result and result.success then
            if data.salary then
                lib.callback('hcyk_bossactions:setSalary', 1000, function(salaryResult)
                    cb(salaryResult or {success = false, message = "Failed to update salary"})
                end, data.job, data.level, data.salary)
            else
                cb(result)
            end
        else
            cb(result or {success = false, message = "Unknown error"})
        end
    end, data.job, data.identifier, data.level)
end)

RegisterNUICallback('createRank', function(data, cb)
    lib.callback('hcyk_bossactions:createRank', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.data)
end)

RegisterNUICallback('updateRank', function(data, cb)
    lib.callback('hcyk_bossactions:updateRank', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.grade, data.data)
end)

RegisterNUICallback('deleteRank', function(data, cb)
    lib.callback('hcyk_bossactions:deleteRank', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.grade)
end)

RegisterNUICallback('getNearbyPlayers', function(data, cb)
    lib.callback('hcyk_bossactions:getNearbyPlayers', 1000, function(players)
        cb(players or {})
    end, data.job)
end)

RegisterNUICallback('showNotification', function(data, cb)
    local type = data.type or 'info'
    local message = data.message or ''
    
    if type == 'success' then
        ESX.ShowNotification(message)
    elseif type == 'error' then
        ESX.ShowNotification('~r~' .. message)
    elseif type == 'warning' then
        ESX.ShowNotification('~y~' .. message)
    else
        ESX.ShowNotification(message)
    end
    
    cb({success = true})
end)

CreateThread(function()
    while true do
        Citizen.Wait(0)
        if IsMenuOpen() then
            if (IsControlJustReleased(0, 177) or IsControlJustReleased(0, 194)) then
                debugPrint("ESC/Backspace pressed, closing menu")
                SetMenuOpen(false)
                SetNuiFocus(false, false)
                SendNUIMessage({
                    action = 'setVisible',
                    data = false
                })
            end
        else
            Citizen.Wait(500)
        end
    end
end)

-- Přidat do main.lua
function ResetMenuState()
    debugPrint("Resetting menu state")
    menuOpen = false -- Přímo nastavíme proměnnou
    SetNuiFocus(false, false)
    SendNUIMessage({
        action = 'setVisible',
        data = false
    })
    debugPrint("Menu state after reset:", IsMenuOpen())
end

-- Přidáme event handler pro reset
RegisterNetEvent('hcyk_bossmenu:resetState')
AddEventHandler('hcyk_bossmenu:resetState', function()
    ResetMenuState()
end)