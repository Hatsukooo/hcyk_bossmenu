

function GetJobData(job)
    local result = SafeMySQL.fetch('SELECT * FROM `jobs` WHERE `name` = ?', { job }, {})
    
    if result and #result > 0 then
        local data = result[1]
        local grades = SafeMySQL.fetch('SELECT * FROM `job_grades` WHERE `job_name` = ? ORDER BY `grade` ASC', { job }, {})
        
        if grades and #grades > 0 then
            data.grades = grades
        else
            data.grades = {}
        end
        
        return data
    end
    
    return {
        name = job,
        label = job,
        grades = {}
    }
end

function GetEmployees(job)
    -- Try multiple query approaches to handle possible collation issues
    local result = {}
    local success = false
    
    -- First try: Using COLLATE directive in the JOIN
    local query1 = [[
        SELECT 
            u.identifier, 
            u.firstname, 
            u.lastname, 
            jg.grade, 
            jg.name AS grade_name, 
            jg.label AS grade_label,
            jg.salary
        FROM 
            users u
        JOIN 
            job_grades jg ON u.job_grade = jg.grade AND jg.job_name COLLATE utf8mb4_general_ci = u.job COLLATE utf8mb4_general_ci
        WHERE 
            u.job = ?
        ORDER BY 
            jg.grade DESC
    ]]
    
    success, result = pcall(function()
        return MySQL.Sync.fetchAll(query1, { job })
    end)
    
    if success and result then
        return result
    end
    
    -- Second try: Alternative approach using a cross join with WHERE conditions
    local query2 = [[
        SELECT 
            u.identifier, 
            u.firstname, 
            u.lastname, 
            jg.grade, 
            jg.name AS grade_name, 
            jg.label AS grade_label,
            jg.salary
        FROM 
            users u, job_grades jg 
        WHERE 
            u.job_grade = jg.grade 
            AND jg.job_name = ? 
            AND u.job = ?
        ORDER BY 
            jg.grade DESC
    ]]
    
    success, result = pcall(function()
        return MySQL.Sync.fetchAll(query2, { job, job })
    end)
    
    if success and result then
        return result
    end
    
    -- Third try: Separate queries as a last resort
    success, result = pcall(function()
        -- Get users with the specified job
        local users = MySQL.Sync.fetchAll("SELECT identifier, firstname, lastname, job_grade FROM users WHERE job = ?", { job })
        local employees = {}
        
        -- For each user, get their job grade details
        for _, user in ipairs(users) do
            local gradeInfo = MySQL.Sync.fetchAll("SELECT grade, name AS grade_name, label AS grade_label, salary FROM job_grades WHERE job_name = ? AND grade = ?", 
                { job, user.job_grade })
                
            if gradeInfo and gradeInfo[1] then
                table.insert(employees, {
                    identifier = user.identifier,
                    firstname = user.firstname,
                    lastname = user.lastname,
                    grade = gradeInfo[1].grade,
                    grade_name = gradeInfo[1].grade_name,
                    grade_label = gradeInfo[1].grade_label,
                    salary = gradeInfo[1].salary
                })
            end
        end
        
        -- Sort by grade descending
        table.sort(employees, function(a, b)
            return a.grade > b.grade
        end)
        
        return employees
    end)
    
    -- Return whatever we got, or an empty table if all approaches failed
    return success and result or {}
end

-- Return a standardized response
local function handleAsyncCallback(cb, success, message)
    cb({
        success = success,
        message = message or (success and "Operation successful" or "Operation failed")
    })
end

lib.callback.register('hcyk_bossactions:hireEmployee', function(source, job, identifier, grade)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local targetPlayer = ESX.GetPlayerFromIdentifier(identifier)
    if targetPlayer then
        -- Online player
        targetPlayer.setJob(job, grade)
        
        -- Notify the player
        TriggerClientEvent('esx:showNotification', targetPlayer.source, 'Byl jsi zaměstnán jako ' .. job)
        
        return {success = true, message = "Hráč byl úspěšně zaměstnán"}
    else
        -- Offline player - handle with a synchronous operation
        local result = MySQL.Sync.execute('UPDATE users SET job = ?, job_grade = ? WHERE identifier = ?', {
            job, grade, identifier
        })
        
        if result and result > 0 then
            return {success = true, message = "Hráč byl úspěšně zaměstnán"}
        else
            return {success = false, message = "Hráč nebyl nalezen"}
        end
    end
end)

lib.callback.register('hcyk_bossactions:fireEmployee', function(source, job, identifier)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local targetPlayer = ESX.GetPlayerFromIdentifier(identifier)
    if targetPlayer then
        -- Online player
        targetPlayer.setJob('unemployed', 0)
        
        -- Notify the player
        TriggerClientEvent('esx:showNotification', targetPlayer.source, 'Byl jsi propuštěn z práce ' .. job)
        
        return {success = true, message = "Hráč byl úspěšně propuštěn"}
    else
        -- Offline player - handle with a synchronous operation
        local result = MySQL.Sync.execute('UPDATE users SET job = ?, job_grade = ? WHERE identifier = ? AND job = ?', {
            'unemployed', 0, identifier, job
        })
        
        if result and result > 0 then
            return {success = true, message = "Hráč byl úspěšně propuštěn"}
        else
            return {success = false, message = "Hráč nebyl nalezen nebo není ve vaší firmě"}
        end
    end
end)

lib.callback.register('hcyk_bossactions:setGrade', function(source, job, identifier, grade)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    local targetPlayer = ESX.GetPlayerFromIdentifier(identifier)
    if targetPlayer then
        -- Online player
        targetPlayer.setJob(job, grade)
        
        -- Notify the player
        TriggerClientEvent('esx:showNotification', targetPlayer.source, 'Tvá pozice ve firmě ' .. job .. ' byla změněna')
        
        return {success = true, message = "Pozice hráče byla úspěšně změněna"}
    else
        -- Offline player - handle with a synchronous operation
        local result = MySQL.Sync.execute('UPDATE users SET job_grade = ? WHERE identifier = ? AND job = ?', {
            grade, identifier, job
        })
        
        if result and result > 0 then
            return {success = true, message = "Pozice hráče byla úspěšně změněna"}
        else
            return {success = false, message = "Hráč nebyl nalezen nebo není ve vaší firmě"}
        end
    end
end)

lib.callback.register('hcyk_bossactions:setSalary', function(source, job, grade, salary)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    -- Handle with a synchronous operation
    local result = MySQL.Sync.execute('UPDATE job_grades SET salary = ? WHERE job_name = ? AND grade = ?', {
        salary, job, grade
    })
    
    if result and result > 0 then
        return {success = true, message = "Plat byl úspěšně změněn"}
    else
        return {success = false, message = "Pozice nebyla nalezena"}
    end
end)

-- Funkce pro získání všech hodností pro danou práci
lib.callback.register('hcyk_bossactions:getRanks', function(source, job)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {}
    end
    
    local ranks = MySQL.Sync.fetchAll('SELECT * FROM job_grades WHERE job_name = ? ORDER BY grade ASC', {job})
    return ranks or {}
end)

-- Funkce pro vytvoření nové hodnosti
lib.callback.register('hcyk_bossactions:createRank', function(source, job, data)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    -- Najít nejvyšší aktuální hodnost
    local maxGrade = MySQL.Sync.fetchScalar('SELECT MAX(grade) FROM job_grades WHERE job_name = ?', {job})
    local newGrade = (tonumber(maxGrade) or 0) + 1
    
    -- Vytvořit novou hodnost - use synchronous
    local success = MySQL.Sync.execute('INSERT INTO job_grades (job_name, grade, name, label, salary) VALUES (?, ?, ?, ?, ?)', {
        job, newGrade, data.name, data.label, data.salary
    })
    
    if success then
        return {success = true, message = "Hodnost byla úspěšně vytvořena"}
    else
        return {success = false, message = "Nepodařilo se vytvořit hodnost"}
    end
end)

-- Funkce pro úpravu hodnosti
lib.callback.register('hcyk_bossactions:updateRank', function(source, job, grade, data)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    -- Use synchronous
    local result = MySQL.Sync.execute('UPDATE job_grades SET name = ?, label = ?, salary = ? WHERE job_name = ? AND grade = ?', {
        data.name, data.label, data.salary, job, grade
    })
    
    if result then
        return {success = true, message = "Hodnost byla úspěšně upravena"}
    else
        return {success = false, message = "Nepodařilo se upravit hodnost"}
    end
end)

-- Funkce pro smazání hodnosti
lib.callback.register('hcyk_bossactions:deleteRank', function(source, job, grade)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or xPlayer.getJob().name ~= job or xPlayer.getJob().grade_name ~= 'boss' then
        return {success = false, message = "Nemáš oprávnění"}
    end
    
    -- Ověření, zda není hodnost používána - synchronously
    local employeesCount = MySQL.Sync.fetchScalar('SELECT COUNT(*) FROM users WHERE job = ? AND job_grade = ?', {job, grade})
    
    if employeesCount > 0 then
        return {success = false, message = "Nemůžeš smazat hodnost, kterou používají zaměstnanci"}
    end
    
    -- Nejprve smazat hodnost - use synchronous to ensure we get a response
    local result = MySQL.Sync.execute('DELETE FROM job_grades WHERE job_name = ? AND grade = ?', {job, grade})
    
    if result then
        -- Aktualizovat ostatní hodnosti - async is OK here since we've already returned success
        MySQL.Async.execute('UPDATE job_grades SET grade = grade - 1 WHERE job_name = ? AND grade > ?', {job, grade})
        return {success = true, message = "Hodnost byla úspěšně smazána"}
    else
        return {success = false, message = "Nepodařilo se smazat hodnost"}
    end
end)