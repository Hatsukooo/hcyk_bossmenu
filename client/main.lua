-- Add this to client/main.lua, replacing any existing NUI callback registrations

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

-- Basic NUI Callbacks
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

-- Employee Management Callbacks
RegisterNUICallback('getEmployees', function(data, cb)
    debugPrint('Fetching employees for job', data.job)
    
    lib.callback('hcyk_bossactions:getEmployees', false, function(employees)
        if employees then
            debugPrint('Received', #employees, 'employees')
            cb(employees)
        else
            debugPrint('No employees received')
            cb({})
        end
    end, data.job)
end)

RegisterNUICallback('hireEmployee', function(data, cb)
    debugPrint('Hiring employee for job', data.job, 'position', data.position)
    
    lib.callback('hcyk_bossactions:hireEmployee', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.player, data.position)
end)

RegisterNUICallback('fireEmployee', function(data, cb)
    debugPrint('Firing employee from job', data.job, 'ID', data.identifier)
    
    local job = data.job
    if type(job) == "table" and job.job then
        job = job.job
    end
    
    lib.callback('hcyk_bossactions:fireEmployee', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, job, data.identifier)
end)

RegisterNUICallback('setEmployeeDetails', function(data, cb)
    debugPrint('Setting employee details for', data.identifier, 'level', data.level)
    
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

-- Finance Management Callbacks
RegisterNUICallback('getSocietyMoney', function(data, cb)
    debugPrint('Getting society money for', data.job)
    
    lib.callback('hcyk_bossactions:getSocietyMoney', 1000, function(money)
        cb(money or 0)
    end, data.job)
end)

RegisterNUICallback('getFinancialStats', function(data, cb)
    debugPrint('Getting financial stats for', data.job, 'time range', data.timeRange)
    
    lib.callback('hcyk_bossactions:getFinancialStats', 1000, function(stats)
        if stats then
            cb(stats)
        else
            cb({income = 0, expenses = 0, netProfit = 0})
        end
    end, data.job, data.timeRange)
end)

-- Rank Management Callbacks
RegisterNUICallback('getRanks', function(data, cb)
    debugPrint('Getting ranks for job', data.job)
    
    lib.callback('hcyk_bossactions:getRanks', 1000, function(ranks)
        if ranks then
            cb(ranks)
        else
            cb({})
        end
    end, data.job)
end)

RegisterNUICallback('createRank', function(data, cb)
    debugPrint('Creating new rank for job', data.job)
    
    lib.callback('hcyk_bossactions:createRank', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.data)
end)

RegisterNUICallback('updateRank', function(data, cb)
    debugPrint('Updating rank', data.grade, 'for job', data.job)
    
    lib.callback('hcyk_bossactions:updateRank', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.grade, data.data)
end)

RegisterNUICallback('deleteRank', function(data, cb)
    debugPrint('Deleting rank', data.grade, 'from job', data.job)
    
    lib.callback('hcyk_bossactions:deleteRank', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.grade)
end)

-- Job Data Callbacks
RegisterNUICallback('getJobData', function(data, cb)
    debugPrint('Getting job data for', data.job)
    
    lib.callback('hcyk_bossactions:getJobData', 1000, function(jobData)
        cb(jobData or {})
    end, data.job)
end)

RegisterNUICallback('updateJobSettings', function(data, cb)
    debugPrint('Updating job settings for', data.job)
    
    lib.callback('hcyk_bossactions:updateJobSettings', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.data)
end)

-- Employee Notes Callbacks
RegisterNUICallback('getEmployeeNote', function(data, cb)
    debugPrint('Getting note for employee', data.identifier, 'job', data.job)
    
    lib.callback('hcyk_bossactions:getEmployeeNote', 1000, function(result)
        cb(result or {success = false, note: ""})
    end, data.job, data.identifier)
end)

RegisterNUICallback('saveEmployeeNote', function(data, cb)
    debugPrint('Saving note for employee', data.identifier, 'job', data.job)
    
    lib.callback('hcyk_bossactions:saveEmployeeNote', 1000, function(result)
        cb(result or {success = false, message = "Unknown error"})
    end, data.job, data.identifier, data.note)
end)

-- Nearby Players Callback
RegisterNUICallback('getNearbyPlayers', function(data, cb)
    debugPrint('Getting nearby players for job', data.job)
    
    lib.callback('hcyk_bossactions:getNearbyPlayers', 1000, function(players)
        cb(players or {})
    end, data.job)
end)

-- Playtime Callbacks
RegisterNUICallback('getEmployeesPlaytime', function(data, cb)
    debugPrint('Getting employees playtime for job', data.job)
    
    lib.callback('hcyk_bossactions:getEmployeesPlaytime', 1000, function(playtime)
        cb(playtime or {})
    end, data.job)
end)

RegisterNUICallback('getEmployeePlaytime', function(data, cb)
    debugPrint('Getting playtime for employee', data.identifier, 'job', data.job)
    
    lib.callback('hcyk_bossactions:getEmployeePlaytime', 1000, function(playtime)
        cb(playtime or {})
    end, data.job, data.identifier)
end)

-- Notifications Callback
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

function ResetMenuState()
    debugPrint("Resetting menu state")
    menuOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({
        action = 'setVisible',
        data = false
    })
    debugPrint("Menu state after reset:", IsMenuOpen())
end

RegisterNetEvent('hcyk_bossmenu:resetState')
AddEventHandler('hcyk_bossmenu:resetState', function()
    ResetMenuState()
end)