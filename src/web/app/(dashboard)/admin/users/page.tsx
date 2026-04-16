'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Search, MoreVertical, Filter } from 'lucide-react';
import { useState } from 'react';

const MOCK_USERS = [
  { id: 'u1', name: 'John Doe', email: 'john@example.com', tier: 'Professional', status: 'ACTIVE', joined: '2026-01-15', lastActive: '2 hours ago' },
  { id: 'u2', name: 'Sarah Smith', email: 'sarah@trading.com', tier: 'Basic', status: 'ACTIVE', joined: '2026-02-20', lastActive: '1 day ago' },
  { id: 'u3', name: 'Mike Ross', email: 'mike@legal.com', tier: 'Enterprise', status: 'SUSPENDED', joined: '2025-11-10', lastActive: '5 days ago' },
  { id: 'u4', name: 'Harvey Specter', email: 'harvey@firm.com', tier: 'Enterprise', status: 'ACTIVE', joined: '2025-09-01', lastActive: '10 mins ago' },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Customer Management</h1>
          <p className="text-slate-400">View and manage all registered users in the platform.</p>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg text-white">All Customers</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <Input placeholder="Search users..." className="pl-9 bg-slate-800 border-slate-700 text-white w-64" />
              </div>
              <Button variant="outline" className="border-slate-700 text-slate-300">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">User</TableHead>
                <TableHead className="text-slate-400">Tier</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Joined</TableHead>
                <TableHead className="text-slate-400">Last Active</TableHead>
                <TableHead className="text-right text-slate-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_USERS.map((user) => (
                <TableRow key={user.id} className="border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-300">{user.tier}</span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={cn(
                        user.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      )}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">{user.joined}</TableCell>
                  <TableCell className="text-slate-500 text-sm">{user.lastActive}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
